// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The names RFC 8414 gives the OAuth 2.0 authorization server metadata.
 * @see https://datatracker.ietf.org/doc/html/rfc8414#section-2
 */
export const AuthorizationServerMetadataField = {
	/**
	 * The issuer.
	 */
	Issuer: "issuer",

	/**
	 * The authorization endpoint.
	 */
	AuthorizationEndpoint: "authorization_endpoint",

	/**
	 * The token endpoint.
	 */
	TokenEndpoint: "token_endpoint",

	/**
	 * The response types supported.
	 */
	ResponseTypesSupported: "response_types_supported",

	/**
	 * The grant types supported.
	 */
	GrantTypesSupported: "grant_types_supported",

	/**
	 * The PKCE code challenge methods supported.
	 */
	CodeChallengeMethodsSupported: "code_challenge_methods_supported",

	/**
	 * How clients authenticate at the token endpoint.
	 */
	TokenEndpointAuthMethodsSupported: "token_endpoint_auth_methods_supported"
} as const;

/**
 * The names RFC 8414 gives the OAuth 2.0 authorization server metadata.
 */
export type AuthorizationServerMetadataField =
	(typeof AuthorizationServerMetadataField)[keyof typeof AuthorizationServerMetadataField];
