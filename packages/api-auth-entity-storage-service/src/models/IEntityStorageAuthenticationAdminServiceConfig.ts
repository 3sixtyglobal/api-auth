// Copyright 2024 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IPasswordHashOptions } from "@3sixty/api-auth-entity-storage-models";

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
	 * The Argon2id parameters used to hash new passwords.
	 */
	passwordHashOptions?: IPasswordHashOptions;

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
