// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuthenticationRateActionConfig } from "@twin.org/api-auth-entity-storage-models";

/**
 * Configuration for the entity storage authentication service.
 */
export interface IEntityStorageAuthenticationServiceConfig {
	/**
	 * The name of the key to retrieve from the vault for signing JWT.
	 * @default auth-signing
	 */
	signingKeyName?: string;

	/**
	 * The default time to live for the JWT.
	 * @default 60
	 */
	defaultTtlMinutes?: number;

	/**
	 * The minimum password length for new password validation.
	 * @default 8
	 */
	minPasswordLength?: number;

	/**
	 * Optional override for login failure rate limit.
	 * @default { maxAttempts: 5, windowMinutes: 15 }
	 */
	loginRateLimit?: IAuthenticationRateActionConfig;

	/**
	 * Optional override for password change rate limit.
	 * @default { maxAttempts: 5, windowMinutes: 15 }
	 */
	passwordChangeRateLimit?: IAuthenticationRateActionConfig;

	/**
	 * Optional override for token refresh rate limit.
	 * @default { maxAttempts: 30, windowMinutes: 60 }
	 */
	tokenRefreshRateLimit?: IAuthenticationRateActionConfig;
}
