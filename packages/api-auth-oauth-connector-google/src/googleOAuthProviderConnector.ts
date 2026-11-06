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
import type { IGoogleOAuthProviderConnectorConfig } from "./models/IGoogleOAuthProviderConnectorConfig.js";
import type { IGoogleOAuthProviderConnectorConstructorOptions } from "./models/IGoogleOAuthProviderConnectorConstructorOptions.js";

/**
 * Authentication provider that signs accounts in with Google.
 */
export class GoogleOAuthProviderConnector implements IOAuthProviderConnector {
	/**
	 * The authentication provider id to register the connector with.
	 */
	public static readonly NAMESPACE: string = "google";

	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<GoogleOAuthProviderConnector>();

	/**
	 * The Google authorization endpoint.
	 */
	public static readonly AUTHORIZATION_ENDPOINT: string =
		"https://accounts.google.com/o/oauth2/v2/auth";

	/**
	 * The Google token endpoint.
	 */
	public static readonly TOKEN_ENDPOINT: string = "https://oauth2.googleapis.com/token";

	/**
	 * The Google signing keys.
	 */
	public static readonly JWKS_URI: string = "https://www.googleapis.com/oauth2/v3/certs";

	/**
	 * The issuers Google uses in ID tokens.
	 */
	public static readonly ISSUERS: string[] = ["https://accounts.google.com", "accounts.google.com"];

	/**
	 * The default address where people change the password for their Google account.
	 */
	public static readonly PASSWORD_CHANGE_URL: string =
		"https://myaccount.google.com/signinoptions/password";

	/**
	 * The default address where people edit the profile Google holds for them.
	 */
	public static readonly PROFILE_EDIT_URL: string = "https://myaccount.google.com/personal-info";

	/**
	 * The ID token claim with the hosted domain of a Google Workspace account.
	 */
	public static readonly CLAIM_HOSTED_DOMAIN: string = "hd";

	/**
	 * The ID token claim with the address of the profile photo.
	 */
	public static readonly CLAIM_PICTURE: string = "picture";

	/**
	 * The width and height of the photo requested from Google, in pixels.
	 */
	public static readonly AVATAR_SIZE: number = 512;

	/**
	 * The hosts Google serves profile photos from, a photo is only fetched from these or their
	 * subdomains.
	 */
	public static readonly AVATAR_HOSTS: string[] = ["googleusercontent.com", "ggpht.com"];

	/**
	 * A path segment giving the size of a photo, as in the older photo addresses.
	 * @internal
	 */
	private static readonly _SIZE_SEGMENT: RegExp = /^s\d+(-[\da-z]+)*$/;

	/**
	 * The client registered with Google.
	 * @internal
	 */
	private readonly _config: IGoogleOAuthProviderConnectorConfig;

	/**
	 * The domains accounts may sign in from, in lower case, any domain when empty.
	 * @internal
	 */
	private readonly _allowedDomains: string[];

	/**
	 * The logging component, when it exists.
	 * @internal
	 */
	private readonly _logging?: ILoggingComponent;

	/**
	 * Create a new instance of GoogleOAuthProviderConnector.
	 * @param options The options for the connector.
	 */
	constructor(options: IGoogleOAuthProviderConnectorConstructorOptions) {
		Guards.object<IGoogleOAuthProviderConnectorConstructorOptions>(
			GoogleOAuthProviderConnector.CLASS_NAME,
			nameof(options),
			options
		);
		Guards.object<IGoogleOAuthProviderConnectorConfig>(
			GoogleOAuthProviderConnector.CLASS_NAME,
			nameof(options.config),
			options.config
		);
		Guards.stringValue(
			GoogleOAuthProviderConnector.CLASS_NAME,
			nameof(options.config.clientId),
			options.config.clientId
		);
		Guards.stringValue(
			GoogleOAuthProviderConnector.CLASS_NAME,
			nameof(options.config.clientSecret),
			options.config.clientSecret
		);
		this._config = options.config;
		this._allowedDomains = (options.config.allowedDomains ?? []).map(domain =>
			domain.toLowerCase()
		);
		this._logging = ComponentFactory.getIfExists<ILoggingComponent>(
			options.loggingComponentType ?? "logging"
		);
	}

	/**
	 * Get the address of a Google profile photo at the size requested, Google sizes a photo with an
	 * option such as =s512-c after the path, or a path segment such as s96-c in older addresses.
	 * @param picture The address from the ID token.
	 * @returns The address, or undefined when it is not an https address on a Google photo host.
	 */
	public static avatarUrl(picture: string): string | undefined {
		if (!URL.canParse(picture)) {
			return undefined;
		}
		const url = new URL(picture);
		const hostname = url.hostname.toLowerCase();
		if (
			url.protocol !== "https:" ||
			!GoogleOAuthProviderConnector.AVATAR_HOSTS.some(
				host => hostname === host || hostname.endsWith(`.${host}`)
			)
		) {
			return undefined;
		}

		const size = `s${GoogleOAuthProviderConnector.AVATAR_SIZE}-c`;
		const segments = url.pathname.split("/");
		const last = segments.length - 1;
		const sizeIndex = segments.findIndex(
			(segment, index) =>
				index > 0 && index < last && GoogleOAuthProviderConnector._SIZE_SEGMENT.test(segment)
		);
		if (sizeIndex >= 0) {
			segments[sizeIndex] = size;
		} else {
			// Any options already on the address, such as =s96-c, are replaced.
			const optionsIndex = segments[last].indexOf("=");
			segments[last] =
				`${optionsIndex >= 0 ? segments[last].slice(0, optionsIndex) : segments[last]}=${size}`;
		}
		url.pathname = segments.join("/");
		if (url.searchParams.has("sz")) {
			url.searchParams.set("sz", `${GoogleOAuthProviderConnector.AVATAR_SIZE}`);
		}
		return url.toString();
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return GoogleOAuthProviderConnector.CLASS_NAME;
	}

	/**
	 * Get what the provider supports, a redirect with passwords and profiles managed by Google.
	 * @returns The provider capabilities.
	 */
	public getCapabilities(): IAuthenticationProviderCapabilities {
		return {
			type: AuthenticationProviderType.OAuth2,
			signInMethod: "redirect",
			passwordChange: "external",
			passwordChangeUrl:
				this._config.passwordChangeUrl ?? GoogleOAuthProviderConnector.PASSWORD_CHANGE_URL,
			profileReadOnly: this._config.profileReadOnly ?? true,
			profileEditUrl: this._config.profileEditUrl ?? GoogleOAuthProviderConnector.PROFILE_EDIT_URL
		};
	}

	/**
	 * Build the address that sends the browser to Google to sign in.
	 * @param request The values for the authorization request.
	 * @returns The authorization address.
	 */
	public authorizationUrl(request: IOAuthAuthorizationRequest): string {
		return OidcHelper.authorizationUrl(
			GoogleOAuthProviderConnector.AUTHORIZATION_ENDPOINT,
			this._config,
			request
		);
	}

	/**
	 * Exchange the authorization code and verify the ID token Google returns.
	 * @param credentials The authorization code and PKCE verifier.
	 * @returns The verified identity.
	 * @throws UnauthorizedError when the exchange or the ID token checks fail, the e-mail address is not
	 * verified, or the domain is not allowed.
	 */
	public async authenticate(
		credentials: IOAuthCodeExchange
	): Promise<IAuthenticationProviderIdentity> {
		const idToken = await OidcHelper.exchangeCode(
			GoogleOAuthProviderConnector.TOKEN_ENDPOINT,
			this._config,
			credentials
		);

		const payload = await OidcHelper.verifyIdToken(idToken, {
			jwksUri: GoogleOAuthProviderConnector.JWKS_URI,
			audience: this._config.clientId,
			nonce: credentials.nonce,
			isIssuer: issuer => GoogleOAuthProviderConnector.ISSUERS.includes(issuer)
		});

		if (payload[OidcHelper.CLAIM_EMAIL_VERIFIED] !== true) {
			throw new UnauthorizedError(GoogleOAuthProviderConnector.CLASS_NAME, "emailNotVerified");
		}

		const identity = OidcHelper.toIdentity(payload);
		if (this._allowedDomains.length > 0) {
			// Only the hosted domain claim proves a Google Workspace account of the domain, the domain of
			// the e-mail address does not, so an account without the claim is refused.
			const hostedDomain = payload[GoogleOAuthProviderConnector.CLAIM_HOSTED_DOMAIN];
			const domain = Is.stringValue(hostedDomain) ? hostedDomain.toLowerCase() : undefined;
			if (!Is.stringValue(domain) || !this._allowedDomains.includes(domain)) {
				throw new UnauthorizedError(GoogleOAuthProviderConnector.CLASS_NAME, "domainNotAllowed", {
					domain
				});
			}
		}

		// The photo is only fetched once the sign in is accepted, and a failure leaves it undefined.
		const picture = payload[GoogleOAuthProviderConnector.CLAIM_PICTURE];
		const avatarUrl = Is.stringValue(picture)
			? GoogleOAuthProviderConnector.avatarUrl(picture)
			: undefined;
		const avatar = Is.stringValue(avatarUrl)
			? await AvatarHelper.fetch(
					avatarUrl,
					{
						width: GoogleOAuthProviderConnector.AVATAR_SIZE,
						height: GoogleOAuthProviderConnector.AVATAR_SIZE
					},
					undefined,
					this._logging,
					this._config.avatar
				)
			: null;

		return {
			...identity,
			avatar,
			profileReadOnly: this._config.profileReadOnly ?? true,
			profileEditUrl: this._config.profileEditUrl ?? GoogleOAuthProviderConnector.PROFILE_EDIT_URL,
			passwordChangeUrl:
				this._config.passwordChangeUrl ?? GoogleOAuthProviderConnector.PASSWORD_CHANGE_URL
		};
	}
}
