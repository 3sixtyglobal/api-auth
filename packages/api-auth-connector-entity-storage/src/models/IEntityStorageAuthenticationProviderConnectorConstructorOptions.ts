// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IEntityStorageAuthenticationProviderConnectorConfig } from "./IEntityStorageAuthenticationProviderConnectorConfig.js";

/**
 * Options for the EntityStorageAuthenticationProviderConnector constructor.
 */
export interface IEntityStorageAuthenticationProviderConnectorConstructorOptions {
	/**
	 * The entity storage for the users.
	 * @default authentication-user
	 */
	userEntityStorageType?: string;

	/**
	 * The configuration for the connector.
	 */
	config?: IEntityStorageAuthenticationProviderConnectorConfig;
}
