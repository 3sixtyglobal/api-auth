// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Leave an organization with the signed in account.
 */
export interface IAccountOrganizationLeaveRequest {
	/**
	 * The path parameters for the request.
	 */
	pathParams: {
		/**
		 * The DID of the organization.
		 */
		organization: string;
	};
}
