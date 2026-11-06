// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import {
	AuthenticationProviderType,
	type IAuthenticationProviderCapabilities,
	type IAuthenticationProviderIdentity
} from "@3sixty/api-auth-models";
import {
	AvatarHelper,
	type IOAuthAuthorizationRequest,
	type IOAuthCodeExchange,
	type IOAuthProviderConnector,
	OidcHelper
} from "@3sixty/api-auth-oauth-models";
import { ComponentFactory, Guards, Is, UnauthorizedError } from "@3sixty/core";
import type { ILoggingComponent } from "@3sixty/logging-models";
import { nameof } from "@3sixty/nameof";
import type { IMicrosoftOAuthProviderConnectorConfig } from "./models/IMicrosoftOAuthProviderConnectorConfig.js";
import type { IMicrosoftOAuthProviderConnectorConstructorOptions } from "./models/IMicrosoftOAuthProviderConnectorConstructorOptions.js";
import { MicrosoftMultiTenantName } from "./models/microsoftMultiTenantName.js";

/**
 * Authentication provider that signs accounts in with Microsoft.
 */
export class MicrosoftOAuthProviderConnector implements IOAuthProviderConnector {
	/**
	 * The authentication provider id to register the connector with.
	 */
	public static readonly NAMESPACE: string = "microsoft";

	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<MicrosoftOAuthProviderConnector>();

	/**
	 * The Microsoft identity platform address.
	 */
	public static readonly AUTHORITY: string = "https://login.microsoftonline.com";

	/**
	 * The default address where people change the password for their Microsoft work account.
	 */
	public static readonly PASSWORD_CHANGE_URL: string =
		"https://mysignins.microsoft.com/security-info/password/change";

	/**
	 * The default address where people edit the profile Microsoft holds for their work account.
	 */
	public static readonly PROFILE_EDIT_URL: string = "https://myaccount.microsoft.com/";

	/**
	 * The default address where people edit the profile of their personal Microsoft account.
	 */
	public static readonly PERSONAL_PROFILE_EDIT_URL: string =
		"https://account.microsoft.com/profile";

	/**
	 * The default address where people change the password of their personal Microsoft account.
	 */
	public static readonly PERSONAL_PASSWORD_CHANGE_URL: string =
		"https://account.live.com/password/Change";

	/**
	 * The optional ID token claim that is true when the domain of the e-mail address is verified by
	 * the tenant, it must be added to the token configuration of the application.
	 */
	public static readonly CLAIM_EMAIL_DOMAIN_OWNER_VERIFIED: string = "xms_edov";

	/**
	 * The ID token claim with the tenant id.
	 */
	public static readonly CLAIM_TENANT_ID: string = "tid";

	/**
	 * The tenant id of personal Microsoft accounts, such as Outlook.com and Hotmail.
	 */
	public static readonly CONSUMER_TENANT_ID: string = "9188040d-6c67-4c5b-b112-36a304b66dad";

	/**
	 * The Microsoft Graph scope needed to read the profile photo, added to the requested scopes.
	 */
	public static readonly GRAPH_USER_READ_SCOPE: string = "User.Read";

	/**
	 * The width and height of the photo requested from Microsoft Graph, in pixels.
	 */
	public static readonly AVATAR_SIZE: number = 504;

	/**
	 * The Microsoft Graph address of the profile photo of the signed in account.
	 */
	public static readonly AVATAR_URL: string =
		"https://graph.microsoft.com/v1.0/me/photos/504x504/$value";

	/**
	 * The client registered with Microsoft.
	 * @internal
	 */
	private readonly _config: IMicrosoftOAuthProviderConnectorConfig;

	/**
	 * The tenant that accounts sign in from.
	 * @internal
	 */
	private readonly _tenant: string;

	/**
	 * The tenants accounts may sign in from, any tenant the authority accepts when empty.
	 * @internal
	 */
	private readonly _allowedTenants: string[];

	/**
	 * The scopes to request, always including the scope needed to read the profile photo.
	 * @internal
	 */
	private readonly _scopes: string[];

	/**
	 * The logging component, when it exists.
	 * @internal
	 */
	private readonly _logging?: ILoggingComponent;

	/**
	 * Create a new instance of MicrosoftOAuthProviderConnector.
	 * @param options The options for the connector.
	 */
	constructor(options: IMicrosoftOAuthProviderConnectorConstructorOptions) {
		Guards.object<IMicrosoftOAuthProviderConnectorConstructorOptions>(
			MicrosoftOAuthProviderConnector.CLASS_NAME,
			nameof(options),
			options
		);
		Guards.object<IMicrosoftOAuthProviderConnectorConfig>(
			MicrosoftOAuthProviderConnector.CLASS_NAME,
			nameof(options.config),
			options.config
		);
		Guards.stringValue(
			MicrosoftOAuthProviderConnector.CLASS_NAME,
			nameof(options.config.clientId),
			options.config.clientId
		);
		Guards.stringValue(
			MicrosoftOAuthProviderConnector.CLASS_NAME,
			nameof(options.config.clientSecret),
			options.config.clientSecret
		);
		// The tenant is required, so accepting accounts from any tenant is a deliberate choice.
		Guards.stringValue(
			MicrosoftOAuthProviderConnector.CLASS_NAME,
			nameof(options.config.tenant),
			options.config.tenant
		);
		this._config = options.config;
		this._tenant = options.config.tenant;
		this._allowedTenants = options.config.allowedTenants ?? [];
		const scopes = options.config.scopes ?? OidcHelper.DEFAULT_SCOPES;
		this._scopes = scopes.some(
			scope =>
				scope.toLowerCase() === MicrosoftOAuthProviderConnector.GRAPH_USER_READ_SCOPE.toLowerCase()
		)
			? scopes
			: [...scopes, MicrosoftOAuthProviderConnector.GRAPH_USER_READ_SCOPE];
		this._logging = ComponentFactory.getIfExists<ILoggingComponent>(
			options.loggingComponentType ?? "logging"
		);
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return MicrosoftOAuthProviderConnector.CLASS_NAME;
	}

	/**
	 * Get what the provider supports, a redirect with passwords and profiles managed by Microsoft.
	 * @param providerTenantId The tenant of an account, personal accounts have their own addresses.
	 * @returns The provider capabilities.
	 */
	public getCapabilities(providerTenantId?: string): IAuthenticationProviderCapabilities {
		const personal = providerTenantId === MicrosoftOAuthProviderConnector.CONSUMER_TENANT_ID;
		return {
			type: AuthenticationProviderType.OAuth2,
			signInMethod: "redirect",
			passwordChange: "external",
			passwordChangeUrl: personal
				? (this._config.personalPasswordChangeUrl ??
					MicrosoftOAuthProviderConnector.PERSONAL_PASSWORD_CHANGE_URL)
				: (this._config.passwordChangeUrl ?? MicrosoftOAuthProviderConnector.PASSWORD_CHANGE_URL),
			profileReadOnly: this._config.profileReadOnly ?? true,
			profileEditUrl: personal
				? (this._config.personalProfileEditUrl ??
					MicrosoftOAuthProviderConnector.PERSONAL_PROFILE_EDIT_URL)
				: (this._config.profileEditUrl ?? MicrosoftOAuthProviderConnector.PROFILE_EDIT_URL)
		};
	}

	/**
	 * Build the address that sends the browser to Microsoft to sign in.
	 * @param request The values for the authorization request.
	 * @returns The authorization address.
	 */
	public authorizationUrl(request: IOAuthAuthorizationRequest): string {
		return OidcHelper.authorizationUrl(
			`${MicrosoftOAuthProviderConnector.AUTHORITY}/${this._tenant}/oauth2/v2.0/authorize`,
			{ ...this._config, scopes: this._scopes },
			request
		);
	}

	/**
	 * Exchange the authorization code and verify the ID token Microsoft returns.
	 * @param credentials The authorization code and PKCE verifier.
	 * @returns The verified identity.
	 * @throws UnauthorizedError when the exchange or the ID token checks fail, the tenant is not
	 * allowed, or the e-mail address is not verified.
	 */
	public async authenticate(
		credentials: IOAuthCodeExchange
	): Promise<IAuthenticationProviderIdentity> {
		const { idToken, accessToken } = await OidcHelper.exchangeCodeForTokens(
			`${MicrosoftOAuthProviderConnector.AUTHORITY}/${this._tenant}/oauth2/v2.0/token`,
			this._config,
			credentials
		);

		const payload = await OidcHelper.verifyIdToken(idToken, {
			jwksUri: `${MicrosoftOAuthProviderConnector.AUTHORITY}/${this._tenant}/discovery/v2.0/keys`,
			audience: this._config.clientId,
			nonce: credentials.nonce,
			isIssuer: (issuer, tokenPayload) => this.isIssuer(issuer, tokenPayload.tid)
		});

		const tenantId = payload[MicrosoftOAuthProviderConnector.CLAIM_TENANT_ID];
		const tenantAllowed = Is.stringValue(tenantId) && this._allowedTenants.includes(tenantId);
		if (this._allowedTenants.length > 0 && !tenantAllowed) {
			throw new UnauthorizedError(MicrosoftOAuthProviderConnector.CLASS_NAME, "tenantNotAllowed", {
				tenantId
			});
		}
		// Microsoft does not verify the e-mail claim of a work account, so it is only trusted when the
		// tenant owns the domain, or the tenant itself is trusted. A personal account has no tenant to
		// own the domain, but Microsoft verifies the address it signs in with.
		if (
			payload[MicrosoftOAuthProviderConnector.CLAIM_EMAIL_DOMAIN_OWNER_VERIFIED] !== true &&
			tenantId !== MicrosoftOAuthProviderConnector.CONSUMER_TENANT_ID &&
			!tenantAllowed
		) {
			throw new UnauthorizedError(MicrosoftOAuthProviderConnector.CLASS_NAME, "emailNotVerified");
		}

		const identity = OidcHelper.toIdentity(payload, ["email", OidcHelper.CLAIM_PREFERRED_USERNAME]);
		const capabilities = this.getCapabilities(Is.stringValue(tenantId) ? tenantId : undefined);
		// The ID token has no photo, it is read from Microsoft Graph once the sign in is accepted, and
		// a failure, or no access token, leaves it undefined.
		const avatar = Is.stringValue(accessToken)
			? await AvatarHelper.fetch(
					MicrosoftOAuthProviderConnector.AVATAR_URL,
					{
						width: MicrosoftOAuthProviderConnector.AVATAR_SIZE,
						height: MicrosoftOAuthProviderConnector.AVATAR_SIZE
					},
					{ authorization: `Bearer ${accessToken}` },
					this._logging,
					this._config.avatar
				)
			: undefined;
		return {
			...identity,
			avatar,
			providerTenantId: Is.stringValue(tenantId) ? tenantId : undefined,
			profileReadOnly: capabilities.profileReadOnly,
			profileEditUrl: capabilities.profileEditUrl,
			passwordChangeUrl: capabilities.passwordChangeUrl
		};
	}

	/**
	 * Check the issuer is the Microsoft tenant the token was issued in, and that tenant is accepted.
	 * @param issuer The issuer claim of the token.
	 * @param tenantId The tenant id claim of the token.
	 * @returns True when the issuer is accepted.
	 * @internal
	 */
	private isIssuer(issuer: string, tenantId: unknown): boolean {
		if (!Is.stringValue(tenantId)) {
			return false;
		}
		if (
			!Is.arrayOneOf<string>(this._tenant, Object.values(MicrosoftMultiTenantName)) &&
			tenantId !== this._tenant
		) {
			return false;
		}
		return issuer === `${MicrosoftOAuthProviderConnector.AUTHORITY}/${tenantId}/v2.0`;
	}
}
