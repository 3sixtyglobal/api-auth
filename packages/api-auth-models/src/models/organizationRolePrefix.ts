// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The default prefixes of the roles held for an organization, each followed by the DID of the
 * organization.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const OrganizationRolePrefix = {
	/**
	 * The org admin role of an organization.
	 */
	Admin: "org-admin:"
} as const;

/**
 * The default prefixes of the roles held for an organization.
 */
export type OrganizationRolePrefix =
	(typeof OrganizationRolePrefix)[keyof typeof OrganizationRolePrefix];
