// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuthHeaderProcessorConfig } from "./IAuthHeaderProcessorConfig.js";

/**
 * Options for the AuthHeaderProcessor constructor.
 */
export interface IAuthHeaderProcessorConstructorOptions {
	/**
	 * The entity storage for users.
	 * @default authentication-user
	 */
	userEntityStorageType?: string;

	/**
	 * The vault for the private keys.
	 * @default vault
	 */
	vaultConnectorType?: string;

	/**
	 * The component to retrieve tenant information.
	 * @default tenant-admin
	 */
	tenantAdminComponentType?: string;

	/**
	 * The configuration for the processor.
	 */
	config?: IAuthHeaderProcessorConfig;
}
