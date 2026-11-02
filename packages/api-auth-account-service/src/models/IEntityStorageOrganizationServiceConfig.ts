// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuthenticationRateActionConfig } from "@3sixty/api-auth-models";

/**
 * Configuration for the EntityStorageOrganizationService.
 */
export interface IEntityStorageOrganizationServiceConfig {
	/**
	 * The verification method added to a created organization DID, used to sign membership credentials.
	 * @default trust-assertion
	 */
	verificationMethodId?: string;

	/**
	 * The role whose holders manage every organization of the tenant, the first member of a created
	 * organization is the caller, who already holds it or escalated privilege.
	 * @default user-admin
	 */
	memberAdminRole?: string;

	/**
	 * The role that grants escalated privilege, callers holding it manage every organization.
	 * @default global-admin
	 */
	escalatedPrivilegeRole?: string;

	/**
	 * The authorization model ID used to look up and give roles.
	 * @default system
	 */
	authorizationModelId?: string;

	/**
	 * How long an organization identity proof may be used for after it was created, in seconds.
	 * @default 300
	 */
	identityProofMaxAgeSeconds?: number;

	/**
	 * How long ago the session of the caller may have started for exporting the identity of an
	 * organization, in seconds.
	 * @default 300
	 */
	recentSignInSeconds?: number;

	/**
	 * The rate limit for exporting the identity of an organization, per caller.
	 * @default { maxAttempts: 5, windowMinutes: 15 }
	 */
	exportIdentityRateLimit?: IAuthenticationRateActionConfig;

	/**
	 * The rate limit for creating an organization from an identity export, per caller.
	 * @default { maxAttempts: 5, windowMinutes: 15 }
	 */
	importIdentityRateLimit?: IAuthenticationRateActionConfig;

	/**
	 * The prefix of the org admin role of an organization, followed by its DID.
	 * @default org-admin:
	 */
	organizationAdminRolePrefix?: string;
}
