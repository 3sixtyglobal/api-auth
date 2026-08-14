// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IEntityStorageAuthenticationServiceConfig } from "./IEntityStorageAuthenticationServiceConfig.js";

/**
 * Options for the EntityStorageAuthenticationService constructor.
 */
export interface IEntityStorageAuthenticationServiceConstructorOptions {
	/**
	 * The entity storage for the users.
	 * @default authentication-user
	 */
	userEntityStorageType?: string;

	/**
	 * The vault for the private keys.
	 * @default vault
	 */
	vaultConnectorType?: string;

	/**
	 * The audit service.
	 * @default authentication-audit
	 */
	authenticationAuditServiceType?: string;

	/**
	 * The rate service.
	 * @default authentication-rate
	 */
	authenticationRateServiceType?: string;

	/**
	 * The component to retrieve tenant information.
	 * @default tenant-admin
	 */
	tenantAdminComponentType?: string;

	/**
	 * The configuration for the authentication.
	 */
	config?: IEntityStorageAuthenticationServiceConfig;
}
