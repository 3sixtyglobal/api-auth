// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The types the credentials an organization issues carry after VerifiableCredential, so a holder
 * can tell what each is for.
 */
export const OrganizationCredentialType = {
	/**
	 * The credential of a membership of the organization.
	 */
	Membership: "OrganizationMembershipCredential"
} as const;

/**
 * The types the credentials an organization issues carry.
 */
export type OrganizationCredentialType =
	(typeof OrganizationCredentialType)[keyof typeof OrganizationCredentialType];
