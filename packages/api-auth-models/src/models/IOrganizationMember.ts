// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * A member of an organization.
 */
export interface IOrganizationMember {
	/**
	 * The account of the member.
	 */
	accountId: string;

	/**
	 * The e-mail address from the profile of the member, when it has one.
	 */
	email?: string;

	/**
	 * The name from the profile of the member, when it has one.
	 */
	name?: string;

	/**
	 * True when the member is an org admin of the organization.
	 */
	isAdmin: boolean;
}
