// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Create an identity with keys the node holds for an account that has none.
 */
export interface IAccountAdminIdentityCreateRequest {
	/**
	 * The path parameters for the request.
	 */
	pathParams: {
		/**
		 * The account.
		 */
		accountId: string;
	};
}
