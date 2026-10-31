// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Export the identity of an account with its private keys.
 */
export interface IAccountAdminIdentityExportRequest {
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
