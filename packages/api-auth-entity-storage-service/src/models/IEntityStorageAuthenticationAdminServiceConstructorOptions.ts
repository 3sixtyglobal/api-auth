// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IEntityStorageAuthenticationAdminServiceConfig } from "./IEntityStorageAuthenticationAdminServiceConfig.js";

/**
 * Options for the EntityStorageAuthenticationAdminService constructor.
 */
export interface IEntityStorageAuthenticationAdminServiceConstructorOptions {
	/**
	 * The entity storage for the users.
	 * @default authentication-user
	 */
	userEntityStorageType?: string;

	/**
	 * The audit component.
	 * @default authentication-audit
	 */
	authenticationAuditServiceType?: string;

	/**
	 * The authorization component used to guard accounts with escalated privilege.
	 * @default authorization
	 */
	authorizationComponentType?: string;

	/**
	 * The configuration for the authentication.
	 */
	config?: IEntityStorageAuthenticationAdminServiceConfig;
}
