// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Stop a member being an org admin of an organization.
 */
export interface IOrganizationAdminRemoveRequest {
	/**
	 * The path parameters for the request.
	 */
	pathParams: {
		/**
		 * The unique identifier or the DID of the organization.
		 */
		id: string;

		/**
		 * The account of the member.
		 */
		accountId: string;
	};
}
