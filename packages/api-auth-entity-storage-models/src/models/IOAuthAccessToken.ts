// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * An access token issued for an OAuth 2.0 authorization code, with the field names RFC 6749 gives them.
 * @see https://datatracker.ietf.org/doc/html/rfc6749#section-5.1
 */
export interface IOAuthAccessToken {
	/**
	 * The access token, a session token of the node.
	 */
	access_token: string;

	/**
	 * The type of the token, Bearer.
	 */
	token_type: string;

	/**
	 * How long the token can be used for, in seconds.
	 */
	expires_in: number;
}
