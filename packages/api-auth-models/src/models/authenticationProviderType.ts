// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The protocol an authentication provider signs accounts in with.
 */
export const AuthenticationProviderType = {
	/**
	 * The e-mail address and password are sent to the node directly.
	 */
	Basic: "basic",

	/**
	 * The browser is sent through an OAuth 2.0 authorization code flow.
	 */
	OAuth2: "oauth2"
} as const;

/**
 * The protocol an authentication provider signs accounts in with.
 */
export type AuthenticationProviderType =
	(typeof AuthenticationProviderType)[keyof typeof AuthenticationProviderType];
