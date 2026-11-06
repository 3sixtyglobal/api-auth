// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Exchange an OAuth 2.0 authorization code for an access token, with the field names RFC 6749 gives
 * them, sent as a form or as JSON.
 * @see https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.3
 */
export interface ITokenRequest {
	/**
	 * The body of the request.
	 */
	body: {
		/**
		 * The grant type, only authorization_code.
		 */
		grant_type: string;

		/**
		 * The authorization code.
		 */
		code: string;

		/**
		 * The redirect address the code was sent to.
		 */
		redirect_uri: string;

		/**
		 * The PKCE code verifier the code challenge was made from.
		 */
		code_verifier: string;

		/**
		 * The id of the client, not checked as clients are public.
		 */
		client_id?: string;
	};
}
