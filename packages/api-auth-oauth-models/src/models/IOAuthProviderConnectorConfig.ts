// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IAvatarFetchOptions } from "./IAvatarFetchOptions.js";

/**
 * Configuration for an OAuth provider connector.
 */
export interface IOAuthProviderConnectorConfig {
	/**
	 * The client id registered with the provider.
	 */
	clientId: string;

	/**
	 * The client secret registered with the provider.
	 */
	clientSecret: string;

	/**
	 * The scopes to request.
	 * @default ["openid", "email", "profile"]
	 */
	scopes?: string[];

	/**
	 * Whether the provider owns the profile, so it can only be edited with the provider.
	 * @default true
	 */
	profileReadOnly?: boolean;

	/**
	 * The address where the profile can be edited, defaults to the provider's account page.
	 */
	profileEditUrl?: string;

	/**
	 * The address where the password is changed, defaults to the provider's security page.
	 */
	passwordChangeUrl?: string;

	/**
	 * The limits the photo the provider holds is fetched with, the defaults when left out.
	 */
	avatar?: IAvatarFetchOptions;
}
