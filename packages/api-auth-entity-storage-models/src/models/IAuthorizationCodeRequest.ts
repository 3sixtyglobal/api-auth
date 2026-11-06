// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The OAuth 2.0 authorization request an authorization code is issued for.
 */
export interface IAuthorizationCodeRequest {
	/**
	 * The state from the authorization request, returned unchanged with the code.
	 */
	state: string;

	/**
	 * The nonce from the authorization request, which the code is bound to.
	 */
	nonce: string;

	/**
	 * The PKCE code challenge, the base64url SHA-256 of the code verifier.
	 */
	codeChallenge: string;

	/**
	 * The PKCE code challenge method, only S256 is accepted.
	 */
	codeChallengeMethod: string;

	/**
	 * The address the browser is sent back to with the code, which must be on the node's public origin.
	 */
	redirectUri: string;
}
