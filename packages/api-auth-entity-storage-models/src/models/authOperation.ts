// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The operation a route hands to the auth processors in the processor state, so they can set or
 * remove the session cookie on the response.
 */
export const AuthOperation = {
	/**
	 * A session was started, the cookie is set to the new token.
	 */
	Login: "login",

	/**
	 * The session was ended, the cookie is removed.
	 */
	Logout: "logout",

	/**
	 * The token was replaced, the cookie is set to the new token.
	 */
	Refresh: "refresh"
} as const;

/**
 * The operation a route hands to the auth processors in the processor state.
 */
export type AuthOperation = (typeof AuthOperation)[keyof typeof AuthOperation];
