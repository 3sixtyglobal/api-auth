// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Configuration for the entity storage OAuth provider connector.
 */
export interface IEntityStorageOAuthProviderConnectorConfig {
	/**
	 * The address of the page where people enter their e-mail address and password. The browser is
	 * sent there with the OAuth 2.0 authorization request in the query, and the page posts it with
	 * the e-mail address and password to the authorize endpoint.
	 */
	loginPageUrl: string;
}
