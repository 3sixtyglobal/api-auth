// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Configuration for the entity storage authentication admin service.
 */
export interface IEntityStorageAuthenticationAdminServiceConfig {
	/**
	 * The minimum password length.
	 * @default 15
	 */
	minPasswordLength?: number;

	/**
	 * The maximum password length.
	 * @default 128
	 */
	maxPasswordLength?: number;

	/**
	 * The role that grants escalated privilege, only callers holding it can modify accounts that hold it.
	 * @default global-admin
	 */
	escalatedPrivilegeRole?: string;

	/**
	 * The authorization model ID used to look up roles.
	 * @default system
	 */
	authorizationModelId?: string;
}
