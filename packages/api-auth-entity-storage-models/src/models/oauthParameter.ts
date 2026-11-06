// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The names RFC 6749 gives the parameters of an OAuth 2.0 token request and response.
 * @see https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.3
 */
export const OAuthParameter = {
	/**
	 * The grant type of a token request.
	 */
	GrantType: "grant_type",

	/**
	 * The authorization code.
	 */
	Code: "code",

	/**
	 * The redirect address the code was sent to.
	 */
	RedirectUri: "redirect_uri",

	/**
	 * The PKCE code verifier.
	 */
	CodeVerifier: "code_verifier",

	/**
	 * The id of the client.
	 */
	ClientId: "client_id",

	/**
	 * The access token of a token response.
	 */
	AccessToken: "access_token",

	/**
	 * The type of the access token.
	 */
	TokenType: "token_type",

	/**
	 * How long the access token can be used for, in seconds.
	 */
	ExpiresIn: "expires_in",

	/**
	 * The error code of a refused request.
	 */
	Error: "error"
} as const;

/**
 * The names RFC 6749 gives the parameters of an OAuth 2.0 token request and response.
 */
export type OAuthParameter = (typeof OAuthParameter)[keyof typeof OAuthParameter];
