// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The credentials an OAuth provider connector exchanges for an identity.
 */
export interface IOAuthCodeExchange {
	/**
	 * The authorization code from the callback.
	 */
	code: string;

	/**
	 * The PKCE code verifier the code challenge was made from.
	 */
	codeVerifier: string;

	/**
	 * The address the provider sent the browser back to.
	 */
	redirectUri: string;

	/**
	 * The nonce sent with the authorization request.
	 */
	nonce: string;
}
