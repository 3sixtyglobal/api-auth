// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type {
	IAuthenticationComponent,
	ILoginResult
} from "@3sixty/api-auth-entity-storage-models";
import { AuthenticationProviderFactory } from "@3sixty/api-auth-models";
import type {
	IOAuthCallback,
	IOAuthCodeExchange,
	IOAuthComponent,
	IOAuthProviderConnector
} from "@3sixty/api-auth-oauth-models";
import { ContextIdHelper, ContextIdKeys, ContextIdStore } from "@3sixty/context";
import {
	AlreadyExistsError,
	BaseError,
	ComponentFactory,
	Converter,
	Guards,
	Is,
	NotFoundError,
	ObjectHelper,
	RandomHelper
} from "@3sixty/core";
import { Sha256 } from "@3sixty/crypto";
import type { ILoggingComponent } from "@3sixty/logging-models";
import { nameof } from "@3sixty/nameof";
import { type IVaultConnector, VaultConnectorFactory, VaultKeyType } from "@3sixty/vault-models";
import type { IOAuthServiceConfig } from "./models/IOAuthServiceConfig.js";
import type { IOAuthServiceConstructorOptions } from "./models/IOAuthServiceConstructorOptions.js";
import type { IOAuthTransaction } from "./models/IOAuthTransaction.js";

/**
 * Runs the OAuth sign in flow for the providers registered with the authentication provider factory.
 */
export class OAuthService implements IOAuthComponent {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<OAuthService>();

	/**
	 * The reason given when the provider is not registered or does not use OAuth.
	 */
	public static readonly ERROR_PROVIDER_DISABLED: string = "providerDisabled";

	/**
	 * The reason given when the person cancelled the sign in at the provider.
	 */
	public static readonly ERROR_CANCELLED: string = "oauthCancelled";

	/**
	 * The reason given when the sign in failed for any other reason.
	 */
	public static readonly ERROR_FAILED: string = "oauthFailed";

	/**
	 * The default name of the vault key that signs the transaction, kept apart from the key that
	 * signs session tokens.
	 */
	public static readonly DEFAULT_TRANSACTION_SIGNING_KEY_NAME: string = "auth-oauth-transaction";

	/**
	 * The default time a sign in may take, in seconds.
	 * @internal
	 */
	private static readonly _DEFAULT_TRANSACTION_TTL_SECONDS: number = 600;

	/**
	 * The default name of the vault key that signed the transaction in earlier versions.
	 * @internal
	 */
	private static readonly _DEFAULT_SIGNING_KEY_NAME: string = "auth-signing";

	/**
	 * The authentication component that creates accounts and issues tokens.
	 * @internal
	 */
	private readonly _authenticationComponent: IAuthenticationComponent;

	/**
	 * The logging component.
	 * @internal
	 */
	private readonly _logging?: ILoggingComponent;

	/**
	 * The configuration for the service.
	 * @internal
	 */
	private readonly _config: IOAuthServiceConfig;

	/**
	 * How long a sign in may take, in milliseconds.
	 * @internal
	 */
	private readonly _transactionTtlMs: number;

	/**
	 * The vault holding the key that signs the transaction.
	 * @internal
	 */
	private readonly _vaultConnector: IVaultConnector;

	/**
	 * The name of the vault key that signs the transaction.
	 * @internal
	 */
	private readonly _transactionSigningKeyName: string;

	/**
	 * The name of the vault key that signed the transaction in earlier versions, still accepted for
	 * a sign in started before.
	 * @internal
	 */
	private readonly _legacySigningKeyName: string;

	/**
	 * The vault keys known to exist, by their full name.
	 * @internal
	 */
	private readonly _existingKeys: Set<string>;

	/**
	 * Create a new instance of OAuthService.
	 * @param options The options for the service.
	 */
	constructor(options: IOAuthServiceConstructorOptions) {
		Guards.object<IOAuthServiceConstructorOptions>(
			OAuthService.CLASS_NAME,
			nameof(options),
			options
		);
		Guards.object<IOAuthServiceConfig>(
			OAuthService.CLASS_NAME,
			nameof(options.config),
			options.config
		);
		Guards.stringValue(
			OAuthService.CLASS_NAME,
			nameof(options.config.successRedirectUrl),
			options.config.successRedirectUrl
		);
		Guards.stringValue(
			OAuthService.CLASS_NAME,
			nameof(options.config.failureRedirectUrl),
			options.config.failureRedirectUrl
		);

		this._authenticationComponent = ComponentFactory.get<IAuthenticationComponent>(
			options.authenticationComponentType ?? "authentication"
		);
		this._logging = ComponentFactory.getIfExists<ILoggingComponent>(
			options.loggingComponentType ?? "logging"
		);
		this._config = options.config;
		this._transactionTtlMs =
			(options.config.transactionTtlSeconds ?? OAuthService._DEFAULT_TRANSACTION_TTL_SECONDS) *
			1000;
		this._vaultConnector = VaultConnectorFactory.get(options.vaultConnectorType ?? "vault");
		this._transactionSigningKeyName =
			options.config.transactionSigningKeyName ?? OAuthService.DEFAULT_TRANSACTION_SIGNING_KEY_NAME;
		this._legacySigningKeyName =
			options.config.signingKeyName ?? OAuthService._DEFAULT_SIGNING_KEY_NAME;
		this._existingKeys = new Set<string>();
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return OAuthService.CLASS_NAME;
	}

	/**
	 * Start a sign in with a provider.
	 * @param authProviderId The authentication provider id.
	 * @param callbackUrl The address the provider sends the browser back to.
	 * @returns The address to send the browser to, and the transaction to keep until the callback.
	 * @throws NotFoundError when the provider is not registered or does not use OAuth.
	 */
	public async beginSignIn(
		authProviderId: string,
		callbackUrl: string
	): Promise<{
		location: string;
		transaction: string;
	}> {
		Guards.stringValue(OAuthService.CLASS_NAME, nameof(authProviderId), authProviderId);
		Guards.stringValue(OAuthService.CLASS_NAME, nameof(callbackUrl), callbackUrl);

		const connector = this.getConnector(authProviderId);

		const transaction: IOAuthTransaction = {
			authProviderId,
			state: this.randomToken(),
			nonce: this.randomToken(),
			codeVerifier: this.randomToken(),
			expires: Date.now() + this._transactionTtlMs
		};

		const location = connector.authorizationUrl({
			state: transaction.state,
			nonce: transaction.nonce,
			codeChallenge: Converter.bytesToBase64Url(
				Sha256.sum256(Converter.utf8ToBytes(transaction.codeVerifier))
			),
			redirectUri: callbackUrl
		});

		return {
			location,
			transaction: await this.signTransaction(transaction)
		};
	}

	/**
	 * Complete a sign in when the provider sends the browser back.
	 * @param authProviderId The authentication provider id.
	 * @param callbackUrl The address the provider sent the browser back to.
	 * @param callback The query parameters from the provider.
	 * @param transaction The transaction kept since the sign in started.
	 * @returns The address to send the browser to, and the login with its profile when the sign in succeeded.
	 */
	public async completeSignIn(
		authProviderId: string,
		callbackUrl: string,
		callback: IOAuthCallback,
		transaction?: string
	): Promise<{
		location: string;
		login?: ILoginResult;
	}> {
		Guards.stringValue(OAuthService.CLASS_NAME, nameof(authProviderId), authProviderId);
		Guards.stringValue(OAuthService.CLASS_NAME, nameof(callbackUrl), callbackUrl);

		if (callback?.error === "access_denied") {
			return { location: this.failureLocation(OAuthService.ERROR_CANCELLED) };
		}

		const started = await this.readTransaction(transaction);
		if (
			!Is.object<IOAuthTransaction>(started) ||
			started.authProviderId !== authProviderId ||
			started.expires < Date.now() ||
			Is.stringValue(callback?.error) ||
			!Is.stringValue(callback?.code) ||
			!this.isSame(started.state, callback.state)
		) {
			await this._logging?.log({
				level: "error",
				ts: Date.now(),
				source: OAuthService.CLASS_NAME,
				message: "signInMismatch",
				error: undefined,
				data: { authProviderId }
			});
			return { location: this.failureLocation(OAuthService.ERROR_FAILED) };
		}

		try {
			this.getConnector(authProviderId);
		} catch (error) {
			await this._logging?.log({
				level: "error",
				ts: Date.now(),
				source: OAuthService.CLASS_NAME,
				message: "signInFailed",
				error: BaseError.fromError(error),
				data: { authProviderId }
			});
			return {
				location: this.failureLocation(OAuthService.ERROR_PROVIDER_DISABLED)
			};
		}

		try {
			const credentials: IOAuthCodeExchange = {
				code: callback.code,
				codeVerifier: started.codeVerifier,
				redirectUri: callbackUrl,
				nonce: started.nonce
			};
			const login = await this._authenticationComponent.loginWithProvider(
				authProviderId,
				credentials
			);

			return {
				location: this._config.successRedirectUrl,
				login
			};
		} catch (error) {
			await this._logging?.log({
				level: "error",
				ts: Date.now(),
				source: OAuthService.CLASS_NAME,
				message: "signInFailed",
				error: BaseError.fromError(error),
				data: { authProviderId }
			});
			return { location: this.failureLocation(OAuthService.ERROR_FAILED) };
		}
	}

	/**
	 * Get the OAuth connector registered for a provider.
	 * @param authProviderId The authentication provider id.
	 * @returns The connector.
	 * @throws NotFoundError when the provider is not registered or does not use OAuth.
	 * @internal
	 */
	private getConnector(authProviderId: string): IOAuthProviderConnector {
		const connector =
			AuthenticationProviderFactory.getIfExists<IOAuthProviderConnector>(authProviderId);
		if (!Is.object(connector) || !("authorizationUrl" in connector)) {
			throw new NotFoundError(OAuthService.CLASS_NAME, "providerNotOAuth", authProviderId, {
				authProviderId
			});
		}
		return connector;
	}

	/**
	 * Build the failure address with the reason.
	 * @param reason The reason the sign in failed.
	 * @returns The failure address.
	 * @internal
	 */
	private failureLocation(reason: string): string {
		const url = new URL(this._config.failureRedirectUrl);
		url.searchParams.set("error", reason);
		return url.toString();
	}

	/**
	 * Create a random token for state, nonce and code verifier values.
	 * @returns The token.
	 * @internal
	 */
	private randomToken(): string {
		return Converter.bytesToBase64Url(RandomHelper.generate(32));
	}

	/**
	 * Sign the transaction kept by the browser, so it cannot be changed or made up.
	 * @param transaction The transaction.
	 * @returns The transaction and its signature.
	 * @internal
	 */
	private async signTransaction(transaction: IOAuthTransaction): Promise<string> {
		const payload = Converter.bytesToBase64Url(
			ObjectHelper.toBytes<IOAuthTransaction>(transaction)
		);
		const keyName = await this.vaultKeyName(this._transactionSigningKeyName);
		await this.ensureKey(keyName);
		const signature = await this._vaultConnector.sign(keyName, Converter.utf8ToBytes(payload));
		return `${payload}.${Converter.bytesToBase64Url(signature)}`;
	}

	/**
	 * Create the vault key that signs the transaction when it does not exist yet.
	 * @param keyName The full name of the vault key.
	 * @returns A promise that resolves when the key exists.
	 * @internal
	 */
	private async ensureKey(keyName: string): Promise<void> {
		if (this._existingKeys.has(keyName)) {
			return;
		}
		try {
			await this._vaultConnector.getKey(keyName, "public");
		} catch (error) {
			if (!BaseError.isErrorName(error, NotFoundError.CLASS_NAME)) {
				throw error;
			}
			try {
				await this._vaultConnector.createKey(keyName, VaultKeyType.Ed25519);
			} catch (createError) {
				// Another request or node created it first.
				if (!BaseError.isErrorName(createError, AlreadyExistsError.CLASS_NAME)) {
					throw createError;
				}
			}
		}
		this._existingKeys.add(keyName);
	}

	/**
	 * Read the transaction kept by the browser, checking its signature.
	 * @param transaction The transaction value.
	 * @returns The transaction, or undefined when it is missing, unsigned, changed or unreadable.
	 * @internal
	 */
	private async readTransaction(transaction?: string): Promise<IOAuthTransaction | undefined> {
		if (!Is.stringValue(transaction)) {
			return undefined;
		}
		const [payload, signature, ...rest] = transaction.split(".");
		if (!Is.stringValue(payload) || !Is.stringValue(signature) || rest.length > 0) {
			return undefined;
		}

		try {
			let verified = await this.verifySignature(
				this._transactionSigningKeyName,
				payload,
				signature
			);
			// A sign in started before the update was signed with the session token key.
			if (!verified && this._legacySigningKeyName !== this._transactionSigningKeyName) {
				verified = await this.verifySignature(this._legacySigningKeyName, payload, signature);
			}
			return verified
				? ObjectHelper.fromBytes<IOAuthTransaction>(Converter.base64UrlToBytes(payload))
				: undefined;
		} catch (error) {
			await this._logging?.log({
				level: "error",
				ts: Date.now(),
				source: OAuthService.CLASS_NAME,
				message: "transactionUnreadable",
				error: BaseError.fromError(error)
			});
			return undefined;
		}
	}

	/**
	 * Check the signature of a transaction with a vault key, a key that does not exist checks nothing.
	 * @param keyName The name of the vault key.
	 * @param payload The signed payload.
	 * @param signature The signature.
	 * @returns True when the signature is valid.
	 * @internal
	 */
	private async verifySignature(
		keyName: string,
		payload: string,
		signature: string
	): Promise<boolean> {
		try {
			return await this._vaultConnector.verify(
				await this.vaultKeyName(keyName),
				Converter.utf8ToBytes(payload),
				Converter.base64UrlToBytes(signature)
			);
		} catch (error) {
			if (BaseError.isErrorName(error, NotFoundError.CLASS_NAME)) {
				return false;
			}
			throw error;
		}
	}

	/**
	 * Get the full name of a vault key held for the node.
	 * @param keyName The name of the key.
	 * @returns The vault key name.
	 * @internal
	 */
	private async vaultKeyName(keyName: string): Promise<string> {
		const contextIds = await ContextIdStore.getContextIds();
		ContextIdHelper.guard(contextIds, ContextIdKeys.Node);
		return `${contextIds[ContextIdKeys.Node]}/${keyName}`;
	}

	/**
	 * Compare two values in constant time.
	 * @param expected The value kept by the browser.
	 * @param actual The value the provider returned.
	 * @returns True when the values are the same.
	 * @internal
	 */
	private isSame(expected: string, actual?: string): boolean {
		if (!Is.stringValue(actual)) {
			return false;
		}
		// Compare digests so the time taken does not depend on where the values differ.
		return (
			Converter.bytesToHex(Sha256.sum256(Converter.utf8ToBytes(expected))) ===
			Converter.bytesToHex(Sha256.sum256(Converter.utf8ToBytes(actual)))
		);
	}
}
