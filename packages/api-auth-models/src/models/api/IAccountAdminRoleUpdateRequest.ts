// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Grant or revoke a role of an account.
 */
export interface IAccountAdminRoleUpdateRequest {
	/**
	 * The path parameters for the request.
	 */
	pathParams: {
		/**
		 * The account.
		 */
		accountId: string;

		/**
		 * The role.
		 */
		role: string;
	};
}
