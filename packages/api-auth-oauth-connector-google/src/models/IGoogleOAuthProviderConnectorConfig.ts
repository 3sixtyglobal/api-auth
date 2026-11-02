// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IOAuthProviderConnectorConfig } from "@3sixty/api-auth-oauth-models";

/**
 * Configuration for the Google OAuth provider connector.
 */
export interface IGoogleOAuthProviderConnectorConfig extends IOAuthProviderConnectorConfig {
	/**
	 * The Google Workspace domains accounts may sign in from, any account when omitted. The hosted
	 * domain (hd) claim must match, so accounts without it, such as gmail.com accounts, are refused.
	 */
	allowedDomains?: string[];
}
