// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import {
	type AuthenticationAuthorizationCode,
	AuthorizationCodeHelper,
	type AuthenticationUser,
	EntityStorageAuthenticationAdminService
} from "@3sixty/api-auth-entity-storage-service";
import {
	AuthenticationProviderType,
	type IAuthenticationProviderCapabilities,
	type IAuthenticationProviderIdentity
} from "@3sixty/api-auth-models";
import type {
	IOAuthAuthorizationRequest,
	IOAuthCodeExchange,
	IOAuthProviderConnector
} from "@3sixty/api-auth-oauth-models";
import { Guards, Is, UnauthorizedError } from "@3sixty/core";
import {
	EntityStorageConnectorFactory,
	type IEntityStorageConnector
} from "@3sixty/entity-storage-models";
import { nameof } from "@3sixty/nameof";
import type { IEntityStorageOAuthProviderConnectorConfig } from "./models/IEntityStorageOAuthProviderConnectorConfig.js";
import type { IEntityStorageOAuthProviderConnectorConstructorOptions } from "./models/IEntityStorageOAuthProviderConnectorConstructorOptions.js";

/**
 * Authentication provider that signs password accounts held in entity storage in through an
 * OAuth 2.0 authorization code flow with PKCE, the node acting as the authorization server.
 */
export class EntityStorageOAuthProviderConnector implements IOAuthProviderConnector {
	/**
	 * The authentication provider id to register the connector with.
	 */
	public static readonly NAMESPACE: string = "3sixty-oauth";

	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<EntityStorageOAuthProviderConnector>();

	/**
	 * The PKCE code challenge method sent to the login page.
	 */
	public static readonly CODE_CHALLENGE_METHOD: string = "S256";

	/**
	 * The entity storage for users.
	 * @internal
	 */
	private readonly _userEntityStorage: IEntityStorageConnector<AuthenticationUser>;

	/**
	 * The entity storage for the authorization codes.
	 * @internal
	 */
	private readonly _authorizationCodeEntityStorage: IEntityStorageConnector<AuthenticationAuthorizationCode>;

	/**
	 * The configuration for the connector.
	 * @internal
	 */
	private readonly _config: IEntityStorageOAuthProviderConnectorConfig;

	/**
	 * Create a new instance of EntityStorageOAuthProviderConnector.
	 * @param options The options for the connector.
	 */
	constructor(options: IEntityStorageOAuthProviderConnectorConstructorOptions) {
		Guards.object<IEntityStorageOAuthProviderConnectorConstructorOptions>(
			EntityStorageOAuthProviderConnector.CLASS_NAME,
			nameof(options),
			options
		);
		Guards.object<IEntityStorageOAuthProviderConnectorConfig>(
			EntityStorageOAuthProviderConnector.CLASS_NAME,
			nameof(options.config),
			options.config
		);
		Guards.stringValue(
			EntityStorageOAuthProviderConnector.CLASS_NAME,
			nameof(options.config.loginPageUrl),
			options.config.loginPageUrl
		);
		this._userEntityStorage = EntityStorageConnectorFactory.get(
			options.userEntityStorageType ?? "authentication-user"
		);
		this._authorizationCodeEntityStorage = EntityStorageConnectorFactory.get(
			options.authorizationCodeEntityStorageType ?? "authentication-authorization-code"
		);
		this._config = options.config;
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return EntityStorageOAuthProviderConnector.CLASS_NAME;
	}

	/**
	 * Get what the provider supports, an e-mail and password form reached through OAuth 2.0, with
	 * passwords and profiles changed on this node.
	 * @returns The provider capabilities.
	 */
	public getCapabilities(): IAuthenticationProviderCapabilities {
		return {
			type: AuthenticationProviderType.OAuth2,
			signInMethod: "password",
			passwordChange: "api",
			profileReadOnly: false
		};
	}

	/**
	 * Build the address of the login page with the authorization request in the query.
	 * @param request The values for the authorization request.
	 * @returns The authorization address.
	 */
	public authorizationUrl(request: IOAuthAuthorizationRequest): string {
		const url = new URL(this._config.loginPageUrl);
		url.searchParams.set("response_type", "code");
		url.searchParams.set("redirect_uri", request.redirectUri);
		url.searchParams.set("state", request.state);
		url.searchParams.set("nonce", request.nonce);
		url.searchParams.set("code_challenge", request.codeChallenge);
		url.searchParams.set(
			"code_challenge_method",
			EntityStorageOAuthProviderConnector.CODE_CHALLENGE_METHOD
		);
		return url.toString();
	}

	/**
	 * Redeem an authorization code issued by the authorize endpoint. The code can only be used once,
	 * and only with the redirect address, nonce and code verifier it was issued for.
	 * @param credentials The authorization code and the values it was issued for.
	 * @returns The identity of the password account.
	 * @throws UnauthorizedError when the code is unknown, used, expired or does not match.
	 */
	public async authenticate(
		credentials: IOAuthCodeExchange
	): Promise<IAuthenticationProviderIdentity> {
		Guards.object<IOAuthCodeExchange>(
			EntityStorageOAuthProviderConnector.CLASS_NAME,
			nameof(credentials),
			credentials
		);
		Guards.stringValue(
			EntityStorageOAuthProviderConnector.CLASS_NAME,
			nameof(credentials.code),
			credentials.code
		);
		Guards.stringValue(
			EntityStorageOAuthProviderConnector.CLASS_NAME,
			nameof(credentials.codeVerifier),
			credentials.codeVerifier
		);
		Guards.stringValue(
			EntityStorageOAuthProviderConnector.CLASS_NAME,
			nameof(credentials.redirectUri),
			credentials.redirectUri
		);
		Guards.stringValue(
			EntityStorageOAuthProviderConnector.CLASS_NAME,
			nameof(credentials.nonce),
			credentials.nonce
		);

		const issued = await AuthorizationCodeHelper.redeem(
			this._authorizationCodeEntityStorage,
			credentials.code,
			credentials.codeVerifier,
			credentials.redirectUri,
			credentials.nonce
		);
		if (!Is.object(issued)) {
			throw new UnauthorizedError(EntityStorageOAuthProviderConnector.CLASS_NAME, "codeInvalid");
		}

		const user = await this._userEntityStorage.get(issued.accountId);
		if (
			!Is.object<AuthenticationUser>(user) ||
			user.authProviderId !== EntityStorageAuthenticationAdminService.AUTH_PROVIDER_ID ||
			!Is.stringValue(user.providerAccountId)
		) {
			throw new UnauthorizedError(EntityStorageOAuthProviderConnector.CLASS_NAME, "codeInvalid");
		}

		return {
			providerAccountId: user.providerAccountId,
			accountId: user.accountId,
			email: user.email
		};
	}
}
