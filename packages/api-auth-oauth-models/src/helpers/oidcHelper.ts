// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { EmailHelper, type IAuthenticationProviderIdentity } from "@3sixty/api-auth-models";
import {
	BaseError,
	Coerce,
	DurationConstants,
	GeneralError,
	Guards,
	Is,
	UnauthorizedError
} from "@3sixty/core";
import { nameof } from "@3sixty/nameof";
import { SchemaOrgContexts } from "@3sixty/standards-schema-org";
import {
	FetchHelper,
	HeaderTypes,
	type IJwk,
	type IJwtPayload,
	Jwk,
	Jwt,
	MimeTypes
} from "@3sixty/web";
import type { IOAuthAuthorizationRequest } from "../models/IOAuthAuthorizationRequest.js";
import type { IOAuthCodeExchange } from "../models/IOAuthCodeExchange.js";
import type { IOAuthProviderConnectorConfig } from "../models/IOAuthProviderConnectorConfig.js";
import type { IOidcIdTokenOptions } from "../models/IOidcIdTokenOptions.js";

/**
 * Helper class for OpenID Connect providers.
 */
export class OidcHelper {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<OidcHelper>();

	/**
	 * The scopes requested when the connector config sets none.
	 */
	public static readonly DEFAULT_SCOPES: string[] = ["openid", "email", "profile"];

	/**
	 * The only signing algorithm accepted for ID tokens.
	 */
	public static readonly ID_TOKEN_ALGORITHM: string = "RS256";

	/**
	 * The ID token claim that says whether the provider verified the e-mail address.
	 */
	public static readonly CLAIM_EMAIL_VERIFIED: string = "email_verified";

	/**
	 * The ID token claim with the given name.
	 */
	public static readonly CLAIM_GIVEN_NAME: string = "given_name";

	/**
	 * The ID token claim with the family name.
	 */
	public static readonly CLAIM_FAMILY_NAME: string = "family_name";

	/**
	 * The ID token claim with the preferred user name.
	 */
	public static readonly CLAIM_PREFERRED_USERNAME: string = "preferred_username";

	/**
	 * The token response field with the ID token.
	 */
	public static readonly TOKEN_RESPONSE_ID_TOKEN: string = "id_token";

	/**
	 * The token response field with the access token.
	 */
	public static readonly TOKEN_RESPONSE_ACCESS_TOKEN: string = "access_token";

	/**
	 * How long to keep a provider's signing keys, in milliseconds.
	 * @internal
	 */
	private static readonly _JWKS_CACHE_TTL_MS: number = DurationConstants.MsPerHour;

	/**
	 * The shortest time between fetches of a provider's signing keys for an unknown key id, in
	 * milliseconds.
	 * @internal
	 */
	private static readonly _JWKS_REFRESH_INTERVAL_MS: number = DurationConstants.MsPerMinute;

	/**
	 * When the signing keys at each address were last fetched for an unknown key id.
	 * @internal
	 */
	private static readonly _JWKS_REFRESHED: Map<string, number> = new Map<string, number>();

	/**
	 * Build the authorization address for a provider, using PKCE.
	 * @param authorizationEndpoint The provider's authorization endpoint.
	 * @param config The connector configuration.
	 * @param request The values for the authorization request.
	 * @returns The authorization address.
	 */
	public static authorizationUrl(
		authorizationEndpoint: string,
		config: IOAuthProviderConnectorConfig,
		request: IOAuthAuthorizationRequest
	): string {
		Guards.stringValue(OidcHelper.CLASS_NAME, nameof(authorizationEndpoint), authorizationEndpoint);
		Guards.object<IOAuthAuthorizationRequest>(OidcHelper.CLASS_NAME, nameof(request), request);

		const url = new URL(authorizationEndpoint);
		url.searchParams.set("response_type", "code");
		url.searchParams.set("client_id", config.clientId);
		url.searchParams.set("redirect_uri", request.redirectUri);
		url.searchParams.set("scope", (config.scopes ?? OidcHelper.DEFAULT_SCOPES).join(" "));
		url.searchParams.set("state", request.state);
		url.searchParams.set("nonce", request.nonce);
		url.searchParams.set("code_challenge", request.codeChallenge);
		url.searchParams.set("code_challenge_method", "S256");
		return url.toString();
	}

	/**
	 * Exchange an authorization code for an ID token.
	 * @param tokenEndpoint The provider's token endpoint.
	 * @param config The connector configuration.
	 * @param exchange The authorization code and PKCE verifier.
	 * @returns The ID token.
	 * @throws UnauthorizedError when the provider rejects the code or returns no ID token.
	 */
	public static async exchangeCode(
		tokenEndpoint: string,
		config: IOAuthProviderConnectorConfig,
		exchange: IOAuthCodeExchange
	): Promise<string> {
		const tokens = await OidcHelper.exchangeCodeForTokens(tokenEndpoint, config, exchange);
		return tokens.idToken;
	}

	/**
	 * Exchange an authorization code for an ID token and the access token issued with it.
	 * @param tokenEndpoint The provider's token endpoint.
	 * @param config The connector configuration.
	 * @param exchange The authorization code and PKCE verifier.
	 * @returns The ID token, and the access token when the provider returned one.
	 * @throws UnauthorizedError when the provider rejects the code or returns no ID token.
	 */
	public static async exchangeCodeForTokens(
		tokenEndpoint: string,
		config: IOAuthProviderConnectorConfig,
		exchange: IOAuthCodeExchange
	): Promise<{ idToken: string; accessToken?: string }> {
		Guards.stringValue(OidcHelper.CLASS_NAME, nameof(tokenEndpoint), tokenEndpoint);
		Guards.object<IOAuthCodeExchange>(OidcHelper.CLASS_NAME, nameof(exchange), exchange);
		Guards.stringValue(OidcHelper.CLASS_NAME, nameof(exchange.code), exchange.code);
		Guards.stringValue(OidcHelper.CLASS_NAME, nameof(exchange.codeVerifier), exchange.codeVerifier);
		Guards.stringValue(OidcHelper.CLASS_NAME, nameof(exchange.redirectUri), exchange.redirectUri);
		// The nonce binds the ID token to the sign in, without it a token could be replayed.
		Guards.stringValue(OidcHelper.CLASS_NAME, nameof(exchange.nonce), exchange.nonce);

		const body = new URLSearchParams([
			["grant_type", "authorization_code"],
			["code", exchange.code],
			["code_verifier", exchange.codeVerifier],
			["redirect_uri", exchange.redirectUri],
			["client_id", config.clientId],
			["client_secret", config.clientSecret]
		]);

		const response = await FetchHelper.fetch(
			OidcHelper.CLASS_NAME,
			tokenEndpoint,
			"POST",
			body.toString(),
			{
				headers: {
					[HeaderTypes.ContentType]: MimeTypes.FormUrlEncoded,
					[HeaderTypes.Accept]: MimeTypes.Json
				}
			}
		);
		if (!response.ok) {
			throw new UnauthorizedError(OidcHelper.CLASS_NAME, "codeExchangeFailed", {
				status: response.status
			});
		}

		const tokens: unknown = await response.json();
		const fields = Is.object<{ [field: string]: unknown }>(tokens) ? tokens : {};
		const idToken = fields[OidcHelper.TOKEN_RESPONSE_ID_TOKEN];
		if (!Is.stringValue(idToken)) {
			throw new UnauthorizedError(OidcHelper.CLASS_NAME, "idTokenMissing");
		}
		const accessToken = fields[OidcHelper.TOKEN_RESPONSE_ACCESS_TOKEN];
		return { idToken, accessToken: Is.stringValue(accessToken) ? accessToken : undefined };
	}

	/**
	 * Verify an ID token against the provider's signing keys and the request it answers.
	 * @param idToken The ID token.
	 * @param options The checks the token must pass.
	 * @returns The token payload.
	 * @throws UnauthorizedError when the token fails any check.
	 */
	public static async verifyIdToken(
		idToken: string,
		options: IOidcIdTokenOptions
	): Promise<IJwtPayload> {
		Guards.stringValue(OidcHelper.CLASS_NAME, nameof(idToken), idToken);
		Guards.object<IOidcIdTokenOptions>(OidcHelper.CLASS_NAME, nameof(options), options);
		Guards.stringValue(OidcHelper.CLASS_NAME, nameof(options.nonce), options.nonce);

		const decoded = await Jwt.decode(idToken);
		if (
			decoded.header?.alg !== OidcHelper.ID_TOKEN_ALGORITHM ||
			!Is.stringValue(decoded.header.kid)
		) {
			throw new UnauthorizedError(OidcHelper.CLASS_NAME, "idTokenHeaderInvalid");
		}

		const jwk = await OidcHelper.getSigningKey(options.jwksUri, decoded.header.kid);

		let payload: IJwtPayload;
		try {
			const key = await Jwk.toCryptoKey(jwk, OidcHelper.ID_TOKEN_ALGORITHM);
			payload = (await Jwt.verify(idToken, key)).payload;
		} catch (error) {
			throw new UnauthorizedError(
				OidcHelper.CLASS_NAME,
				"idTokenSignatureInvalid",
				undefined,
				BaseError.fromError(error)
			);
		}

		const audience = Is.array(payload.aud) ? payload.aud : [payload.aud];
		const expires = Coerce.integer(payload.exp);

		if (!Is.stringValue(payload.iss) || !options.isIssuer(payload.iss, payload)) {
			throw new UnauthorizedError(OidcHelper.CLASS_NAME, "idTokenIssuerInvalid");
		} else if (!audience.includes(options.audience)) {
			throw new UnauthorizedError(OidcHelper.CLASS_NAME, "idTokenAudienceInvalid");
		} else if (
			!Is.integer(expires) ||
			expires < Math.trunc(Date.now() / DurationConstants.MsPerSecond)
		) {
			throw new UnauthorizedError(OidcHelper.CLASS_NAME, "idTokenExpired");
		} else if (payload.nonce !== options.nonce) {
			throw new UnauthorizedError(OidcHelper.CLASS_NAME, "idTokenNonceInvalid");
		} else if (!Is.stringValue(payload.sub)) {
			throw new UnauthorizedError(OidcHelper.CLASS_NAME, "idTokenSubjectMissing");
		}

		return payload;
	}

	/**
	 * Map a verified ID token payload to the identity it describes, with a schema.org Person profile.
	 * @param payload The verified ID token payload.
	 * @param emailClaims The claims to read the e-mail address from, in order.
	 * @returns The identity.
	 * @throws UnauthorizedError when the token has no e-mail address.
	 */
	public static toIdentity(
		payload: IJwtPayload,
		emailClaims: string[] = ["email"]
	): IAuthenticationProviderIdentity {
		const claim = emailClaims.map(name => payload[name]).find(value => Is.stringValue(value));
		const email = Is.stringValue(claim) ? EmailHelper.normalise(claim) : undefined;
		if (!Is.stringValue(email) || !Is.stringValue(payload.sub)) {
			throw new UnauthorizedError(OidcHelper.CLASS_NAME, "idTokenEmailMissing");
		}

		return {
			providerAccountId: payload.sub,
			email,
			profile: {
				"@context": SchemaOrgContexts.Context,
				"@type": "Person",
				email,
				name: Coerce.string(payload.name),
				givenName: Coerce.string(payload[OidcHelper.CLAIM_GIVEN_NAME]),
				familyName: Coerce.string(payload[OidcHelper.CLAIM_FAMILY_NAME]),
				image: Coerce.string(payload.picture)
			}
		};
	}

	/**
	 * Find a provider's signing key by its key id.
	 * @param jwksUri The address of the provider's signing keys.
	 * @param kid The key id.
	 * @returns The signing key.
	 * @throws UnauthorizedError when the provider has no key with that id.
	 * @internal
	 */
	private static async getSigningKey(jwksUri: string, kid: string): Promise<IJwk> {
		let jwk = (await OidcHelper.getSigningKeys(jwksUri)).find(k => k.kid === kid);

		// A provider that rotated its keys is asked again, at most once a minute so made up key ids
		// cannot be used to make the node fetch the keys on every request.
		const now = Date.now();
		const lastRefresh = OidcHelper._JWKS_REFRESHED.get(jwksUri) ?? 0;
		if (!Is.object<IJwk>(jwk) && now - lastRefresh >= OidcHelper._JWKS_REFRESH_INTERVAL_MS) {
			OidcHelper._JWKS_REFRESHED.set(jwksUri, now);
			FetchHelper.removeCacheEntry(jwksUri);
			jwk = (await OidcHelper.getSigningKeys(jwksUri)).find(k => k.kid === kid);
		}

		if (!Is.object<IJwk>(jwk)) {
			throw new UnauthorizedError(OidcHelper.CLASS_NAME, "signingKeyNotFound", { kid });
		}
		return jwk;
	}

	/**
	 * Get a provider's signing keys, through the cache.
	 * @param jwksUri The address of the provider's signing keys.
	 * @returns The signing keys.
	 * @internal
	 */
	private static async getSigningKeys(jwksUri: string): Promise<IJwk[]> {
		try {
			const jwks = await FetchHelper.fetchJson<never, { keys?: IJwk[] }>(
				OidcHelper.CLASS_NAME,
				jwksUri,
				"GET",
				undefined,
				{ cacheTtlMs: OidcHelper._JWKS_CACHE_TTL_MS }
			);
			return jwks.keys ?? [];
		} catch (error) {
			throw new GeneralError(OidcHelper.CLASS_NAME, "signingKeysFailed", { jwksUri }, error);
		}
	}
}
