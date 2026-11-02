// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IJwtPayload } from "@3sixty/web";

/**
 * The checks an OpenID Connect ID token must pass.
 */
export interface IOidcIdTokenOptions {
	/**
	 * The address of the provider's signing keys.
	 */
	jwksUri: string;

	/**
	 * The client id the token must be issued to.
	 */
	audience: string;

	/**
	 * The nonce sent with the authorization request.
	 */
	nonce: string;

	/**
	 * Check whether the issuer is the provider.
	 * @param issuer The issuer claim of the token.
	 * @param payload The payload of the token.
	 * @returns True when the issuer is the provider.
	 */
	isIssuer: (issuer: string, payload: IJwtPayload) => boolean;
}
