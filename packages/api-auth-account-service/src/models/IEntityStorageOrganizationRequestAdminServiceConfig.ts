// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Configuration for the EntityStorageOrganizationRequestAdminService.
 */
export interface IEntityStorageOrganizationRequestAdminServiceConfig {
	/**
	 * The verification method of the organization that signs the membership credential.
	 * @default trust-assertion
	 */
	verificationMethodId?: string;

	/**
	 * The role that grants escalated privilege, only callers holding it accept the requests of, or
	 * remove the requests of, accounts holding it.
	 * @default global-admin
	 */
	escalatedPrivilegeRole?: string;

	/**
	 * The authorization model ID used to look up roles.
	 * @default system
	 */
	authorizationModelId?: string;

	/**
	 * The prefix of the org admin role of an organization, followed by its DID.
	 * @default org-admin:
	 */
	organizationAdminRolePrefix?: string;
}
