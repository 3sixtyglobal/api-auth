// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { Coerce, Is, UnauthorizedError } from "@twin.org/core";
import { nameof } from "@twin.org/nameof";
import { type IVaultConnector, VaultConnectorHelper } from "@twin.org/vault-models";
import {
	CookieHelper,
	HeaderHelper,
	HeaderTypes,
	type IHttpHeaders,
	type IJwtHeader,
	type IJwtPayload,
	Jwt
} from "@twin.org/web";

/**
 * Helper class for token operations.
 */
export class TokenHelper {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<TokenHelper>();

	/**
	 * Create a new token.
	 * @param vaultConnector The vault connector.
	 * @param nodeId The node identifier, embedded as the JWT issuer claim.
	 * @param signingKeyName The signing key name, embedded as the JWT key identifier.
	 * @param userIdentity The subject for the token.
	 * @param organizationIdentity The organization for the token.
	 * @param tenantId The tenant id for the token.
	 * @param ttlMinutes The time to live for the token in minutes.
	 * @param passwordVersion The user's current password version counter, embedded in the token so that a password change invalidates existing tokens.
	 * @returns The new token and its expiry date.
	 */
	public static async createToken(
		vaultConnector: IVaultConnector,
		nodeId: string,
		signingKeyName: string,
		userIdentity: string,
		organizationIdentity: string | undefined,
		tenantId: string | undefined,
		ttlMinutes: number,
		passwordVersion?: number
	): Promise<{
		token: string;
		expiry: number;
	}> {
		const nowSeconds = Math.trunc(Date.now() / 1000);
		const ttlSeconds = ttlMinutes * 60;
		const vaultKeyName = `${nodeId}/${signingKeyName}`;

		const jwt = await Jwt.encodeWithSigner(
			{ alg: "EdDSA", kid: signingKeyName },
			{
				iss: nodeId,
				sub: userIdentity,
				org: organizationIdentity,
				tid: tenantId,
				exp: nowSeconds + ttlSeconds,
				pver: passwordVersion
			},
			async (header, payload) =>
				VaultConnectorHelper.jwtSigner(vaultConnector, vaultKeyName, header, payload)
		);

		return {
			token: jwt,
			expiry: (nowSeconds + ttlSeconds) * 1000
		};
	}

	/**
	 * Verify the token.
	 * @param vaultConnector The vault connector.
	 * @param nodeId The node identifier, expected to match the JWT issuer claim.
	 * @param signingKeyName The signing key name, expected to match the JWT key identifier.
	 * @param token The token to verify.
	 * @param verifyUser A function to verify the user identity and organization. The password version counter embedded in the token (pver claim) is passed so callers can detect if the password has changed since the token was issued.
	 * @returns The verified details.
	 * @throws UnauthorizedError if the token is missing, invalid or expired.
	 */
	public static async verify(
		vaultConnector: IVaultConnector,
		nodeId: string,
		signingKeyName: string,
		token: string | undefined,
		verifyUser?: (
			sub: string,
			org: string,
			tid: string | undefined,
			passwordVersion: number | undefined
		) => Promise<string[]>
	): Promise<{
		header: IJwtHeader;
		payload: IJwtPayload;
	}> {
		if (!Is.stringValue(token)) {
			throw new UnauthorizedError(TokenHelper.CLASS_NAME, "missing");
		}

		const vaultKeyName = `${nodeId}/${signingKeyName}`;
		const decoded = await Jwt.verifyWithVerifier(token, async t =>
			VaultConnectorHelper.jwtVerifier(vaultConnector, vaultKeyName, t)
		);

		// If some of the header/payload data is not properly populated then it is unauthorized.
		if (decoded.header.kid !== signingKeyName) {
			throw new UnauthorizedError(TokenHelper.CLASS_NAME, "headerKeyIdMismatch");
		} else if (decoded.payload.iss !== nodeId) {
			throw new UnauthorizedError(TokenHelper.CLASS_NAME, "payloadIssuerMismatch");
		} else if (!Is.stringValue(decoded.payload.sub)) {
			throw new UnauthorizedError(TokenHelper.CLASS_NAME, "payloadMissingSubject");
		} else if (!Is.stringValue(decoded.payload.org)) {
			throw new UnauthorizedError(TokenHelper.CLASS_NAME, "payloadMissingOrganization");
		} else if (
			!Is.empty(decoded.payload?.exp) &&
			decoded.payload.exp < Math.trunc(Date.now() / 1000)
		) {
			throw new UnauthorizedError(TokenHelper.CLASS_NAME, "expired");
		}

		if (Is.function(verifyUser)) {
			const tid = Coerce.string(decoded.payload.tid);
			const userVerified = await verifyUser(
				decoded.payload.sub,
				decoded.payload.org,
				tid,
				Coerce.integer(decoded.payload.pver)
			);
			if (!userVerified.includes("user")) {
				throw new UnauthorizedError(TokenHelper.CLASS_NAME, "userNotVerified");
			} else if (!userVerified.includes("organization")) {
				throw new UnauthorizedError(TokenHelper.CLASS_NAME, "organizationNotVerified");
			} else if (Is.stringValue(tid) && !userVerified.includes("tenant")) {
				throw new UnauthorizedError(TokenHelper.CLASS_NAME, "tenantNotVerified");
			}
		}

		return {
			header: decoded.header,
			payload: decoded.payload
		};
	}

	/**
	 * Extract the auth token from the headers, either from the authorization header or the cookie header.
	 * @param headers The headers to extract the token from.
	 * @param cookieName The name of the cookie to extract the token from.
	 * @returns The token if found.
	 */
	public static extractTokenFromHeaders(
		headers?: IHttpHeaders,
		cookieName?: string
	):
		| {
				token: string;
				location: "authorization" | "cookie";
		  }
		| undefined {
		const authHeader = headers?.[HeaderTypes.Authorization];
		const cookiesHeader = headers?.[HeaderTypes.Cookie];

		const bearerToken = HeaderHelper.extractBearer(authHeader);
		if (Is.stringValue(bearerToken)) {
			return {
				token: bearerToken,
				location: "authorization"
			};
		} else if (Is.notEmpty(cookiesHeader) && Is.stringValue(cookieName)) {
			const value = CookieHelper.getCookieFromHeaders(cookiesHeader, cookieName);
			if (Is.stringValue(value)) {
				return {
					token: value,
					location: "cookie"
				};
			}
		}
	}
}
