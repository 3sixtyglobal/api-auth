// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IOAuthProviderConnectorConfig } from "@3sixty/api-auth-oauth-models";

/**
 * Configuration for the Microsoft OAuth provider connector.
 */
export interface IMicrosoftOAuthProviderConnectorConfig extends IOAuthProviderConnectorConfig {
	/**
	 * The tenant that accounts sign in from, a tenant id or one of common, organizations or consumers.
	 */
	tenant: string;

	/**
	 * The tenant ids accounts may sign in from, any tenant the tenant setting accepts when omitted.
	 * The e-mail address of an account from one of these tenants is trusted without the xms_edov claim.
	 */
	allowedTenants?: string[];

	/**
	 * The address where personal accounts edit their profile, profileEditUrl is used for work accounts.
	 */
	personalProfileEditUrl?: string;

	/**
	 * The address where personal accounts change their password, passwordChangeUrl is used for work
	 * accounts.
	 */
	personalPasswordChangeUrl?: string;
}
