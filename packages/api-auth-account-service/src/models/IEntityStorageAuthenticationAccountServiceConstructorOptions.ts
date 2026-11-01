// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IEntityStorageAuthenticationAccountServiceConfig } from "./IEntityStorageAuthenticationAccountServiceConfig.js";

/**
 * Options for the EntityStorageAuthenticationAccountService constructor.
 */
export interface IEntityStorageAuthenticationAccountServiceConstructorOptions {
	/**
	 * The entity storage for the account data.
	 * @default account-data
	 */
	accountDataEntityStorageType?: string;

	/**
	 * The entity storage for the requests to join an organization.
	 * @default organization-request
	 */
	organizationRequestEntityStorageType?: string;

	/**
	 * The identity component used to create and verify the identity of an account.
	 * @default identity-service
	 */
	identityComponentType?: string;

	/**
	 * The rate component used to limit adopting, exporting and importing.
	 * @default authentication-rate
	 */
	authenticationRateServiceType?: string;

	/**
	 * The entity storage for the registered organizations, which accounts may only join.
	 * @default organization
	 */
	organizationEntityStorageType?: string;

	/**
	 * The logging component that records failures the service recovers from, when it exists.
	 * @default logging
	 */
	loggingComponentType?: string;

	/**
	 * The configuration for the service.
	 */
	config?: IEntityStorageAuthenticationAccountServiceConfig;
}
