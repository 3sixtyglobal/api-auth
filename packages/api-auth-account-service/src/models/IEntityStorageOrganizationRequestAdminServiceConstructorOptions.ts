// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IEntityStorageOrganizationRequestAdminServiceConfig } from "./IEntityStorageOrganizationRequestAdminServiceConfig.js";

/**
 * Options for the EntityStorageOrganizationRequestAdminService constructor.
 */
export interface IEntityStorageOrganizationRequestAdminServiceConstructorOptions {
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
	 * The identity component used to issue the membership credential.
	 * @default identity-service
	 */
	identityComponentType?: string;

	/**
	 * The authorization component used to find callers with escalated privilege.
	 * @default authorization
	 */
	authorizationComponentType?: string;

	/**
	 * The entity storage for the registered organizations, when it exists accounts only join
	 * registered organizations.
	 * @default organization
	 */
	organizationEntityStorageType?: string;

	/**
	 * The configuration for the service.
	 */
	config?: IEntityStorageOrganizationRequestAdminServiceConfig;
}
