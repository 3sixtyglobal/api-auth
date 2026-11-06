// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The OAuth 2.0 authorization server metadata of the node, with the field names RFC 8414 gives them.
 * @see https://datatracker.ietf.org/doc/html/rfc8414#section-2
 */
export interface IAuthorizationServerMetadata {
	/**
	 * The issuer, the public origin of the node.
	 */
	issuer: string;

	/**
	 * The address of the login page that takes the authorization request.
	 */
	authorization_endpoint: string;

	/**
	 * The address the authorization code is exchanged at.
	 */
	token_endpoint: string;

	/**
	 * The response types supported, only code.
	 */
	response_types_supported: string[];

	/**
	 * The grant types supported, only authorization_code.
	 */
	grant_types_supported: string[];

	/**
	 * The PKCE code challenge methods supported, only S256.
	 */
	code_challenge_methods_supported: string[];

	/**
	 * How clients authenticate at the token endpoint, only none as clients are public and use PKCE.
	 */
	token_endpoint_auth_methods_supported: string[];
}
