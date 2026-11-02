// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Join an organization with the signed in account.
 */
export interface IAccountOrganizationJoinRequest {
	/**
	 * The organization to join.
	 */
	body: {
		/**
		 * The DID of the organization.
		 */
		organization: string;
	};
}
