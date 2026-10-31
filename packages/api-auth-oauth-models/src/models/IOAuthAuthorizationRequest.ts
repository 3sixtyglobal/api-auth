// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The values needed to send a browser to a provider to sign in.
 */
export interface IOAuthAuthorizationRequest {
	/**
	 * The value the provider returns unchanged, to match the callback to this request.
	 */
	state: string;

	/**
	 * The value the provider puts in the ID token, to bind the token to this request.
	 */
	nonce: string;

	/**
	 * The PKCE code challenge, the base64url SHA-256 of the code verifier.
	 */
	codeChallenge: string;

	/**
	 * The address the provider sends the browser back to.
	 */
	redirectUri: string;
}
