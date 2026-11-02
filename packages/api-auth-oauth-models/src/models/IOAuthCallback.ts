// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The query parameters a provider sends the browser back with.
 */
export interface IOAuthCallback {
	/**
	 * The authorization code, when the sign in succeeded.
	 */
	code?: string;

	/**
	 * The state sent with the authorization request.
	 */
	state?: string;

	/**
	 * The error code, when the sign in did not succeed.
	 */
	error?: string;
}
