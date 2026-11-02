// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Configuration for the EntityStorageAuthenticationAccountAdminService.
 */
export interface IEntityStorageAuthenticationAccountAdminServiceConfig {
	/**
	 * The role that grants escalated privilege, only callers holding it can change the identity or
	 * organization of accounts that hold it, or of their own account, or bind an identity without a proof.
	 * @default global-admin
	 */
	escalatedPrivilegeRole?: string;

	/**
	 * The authorization model ID used to look up roles.
	 * @default system
	 */
	authorizationModelId?: string;

	/**
	 * How long an identity proof may be used for after it was created, in seconds.
	 * @default 300
	 */
	identityProofMaxAgeSeconds?: number;

	/**
	 * The verification method of the organization that signs the membership credential.
	 * @default trust-assertion
	 */
	verificationMethodId?: string;

	/**
	 * How long ago the session of the caller may have started for exporting the identity of an
	 * account, in seconds.
	 * @default 300
	 */
	recentSignInSeconds?: number;

	/**
	 * The roles a caller holding escalated privilege may always grant and revoke, with the escalated
	 * privilege role and every role in use, such as tenant-admin when tenants are enabled.
	 * @default ["user-admin"]
	 */
	assignableRoles?: string[];

	/**
	 * The prefix of the org admin role of an organization, followed by its DID.
	 * @default org-admin:
	 */
	organizationAdminRolePrefix?: string;
}
