// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IEntityStorageAuthenticationRateServiceConfig } from "./IEntityStorageAuthenticationRateServiceConfig.js";

/**
 * Options for the EntityStorageAuthenticationRateService constructor.
 */
export interface IEntityStorageAuthenticationRateServiceConstructorOptions {
	/**
	 * The entity storage for authentication rate entries.
	 * @default authentication-rate-entry
	 */
	authenticationRateEntryStorageType?: string;

	/**
	 * The task scheduler component type.
	 * @default task-scheduler
	 */
	taskSchedulerComponentType?: string;

	/**
	 * The platform component type, used to run the periodic cleanup per tenant.
	 * @default platform
	 */
	platformComponentType?: string;

	/**
	 * The configuration for the authentication rate service.
	 */
	config?: IEntityStorageAuthenticationRateServiceConfig;
}
