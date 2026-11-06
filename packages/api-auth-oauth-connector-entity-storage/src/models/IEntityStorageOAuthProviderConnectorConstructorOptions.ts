// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IEntityStorageOAuthProviderConnectorConfig } from "./IEntityStorageOAuthProviderConnectorConfig.js";

/**
 * Options for the EntityStorageOAuthProviderConnector constructor.
 */
export interface IEntityStorageOAuthProviderConnectorConstructorOptions {
	/**
	 * The entity storage for the users.
	 * @default authentication-user
	 */
	userEntityStorageType?: string;

	/**
	 * The entity storage for the authorization codes.
	 * @default authentication-authorization-code
	 */
	authorizationCodeEntityStorageType?: string;

	/**
	 * The configuration for the connector.
	 */
	config: IEntityStorageOAuthProviderConnectorConfig;
}
