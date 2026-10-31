// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IEntityStorageOrganizationServiceConfig } from "./IEntityStorageOrganizationServiceConfig.js";

/**
 * Options for the EntityStorageOrganizationService constructor.
 */
export interface IEntityStorageOrganizationServiceConstructorOptions {
	/**
	 * The entity storage for the organizations.
	 * @default organization
	 */
	organizationEntityStorageType?: string;

	/**
	 * The entity storage for the account data, which holds the organization profiles and memberships.
	 * @default account-data
	 */
	accountDataEntityStorageType?: string;

	/**
	 * The entity storage for the requests to join an organization, whose pending requests are
	 * rejected when the organization is removed, when it exists.
	 * @default organization-request
	 */
	organizationRequestEntityStorageType?: string;

	/**
	 * The identity component used to create organization DIDs and membership credentials.
	 * @default identity-service
	 */
	identityComponentType?: string;

	/**
	 * The authorization component used to find callers with escalated privilege and give roles.
	 * @default authorization
	 */
	authorizationComponentType?: string;

	/**
	 * The rate component used to limit exporting and importing organization identities, when it exists.
	 * @default authentication-rate
	 */
	authenticationRateServiceType?: string;

	/**
	 * The logging component that records failures the service recovers from, when it exists.
	 * @default logging
	 */
	loggingComponentType?: string;

	/**
	 * The configuration for the service.
	 */
	config?: IEntityStorageOrganizationServiceConfig;
}
