// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * A sign in kept by the browser between starting and the callback.
 */
export interface IOAuthTransaction {
	/**
	 * The authentication provider id the sign in started with.
	 */
	authProviderId: string;

	/**
	 * The state sent with the authorization request.
	 */
	state: string;

	/**
	 * The nonce sent with the authorization request.
	 */
	nonce: string;

	/**
	 * The PKCE code verifier.
	 */
	codeVerifier: string;

	/**
	 * When the sign in expires, in milliseconds since the epoch.
	 */
	expires: number;
}
