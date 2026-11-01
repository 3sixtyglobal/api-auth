// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IEntityStorageAuthenticationAccountAdminServiceConfig } from "./IEntityStorageAuthenticationAccountAdminServiceConfig.js";

/**
 * Options for the EntityStorageAuthenticationAccountAdminService constructor.
 */
export interface IEntityStorageAuthenticationAccountAdminServiceConstructorOptions {
	/**
	 * The entity storage for the account data.
	 * @default account-data
	 */
	accountDataEntityStorageType?: string;

	/**
	 * The authorization component used to guard accounts with escalated privilege.
	 * @default authorization
	 */
	authorizationComponentType?: string;

	/**
	 * The rate component used to limit exporting and importing.
	 * @default authentication-rate
	 */
	authenticationRateServiceType?: string;

	/**
	 * The identity component used to verify identity proofs and issue membership credentials.
	 * @default identity-service
	 */
	identityComponentType?: string;

	/**
	 * The entity storage for the registered organizations, which accounts may only join.
	 * @default organization
	 */
	organizationEntityStorageType?: string;

	/**
	 * The entity storage for the requests to join an organization, whose pending requests are
	 * removed with the identity of an account.
	 * @default organization-request
	 */
	organizationRequestEntityStorageType?: string;

	/**
	 * The entity storage for the users, an account id must belong to a user to manage its identity
	 * and profile.
	 * @default authentication-user
	 */
	userEntityStorageType?: string;

	/**
	 * The logging component that records failures the service recovers from, when it exists.
	 * @default logging
	 */
	loggingComponentType?: string;

	/**
	 * The configuration for the service.
	 */
	config?: IEntityStorageAuthenticationAccountAdminServiceConfig;
}
