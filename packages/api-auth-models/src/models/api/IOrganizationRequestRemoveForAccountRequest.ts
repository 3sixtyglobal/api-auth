// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Remove every request of an account to join an organization.
 */
export interface IOrganizationRequestRemoveForAccountRequest {
	/**
	 * The path parameters for the request.
	 */
	pathParams: {
		/**
		 * The account id.
		 */
		accountId: string;
	};
}
