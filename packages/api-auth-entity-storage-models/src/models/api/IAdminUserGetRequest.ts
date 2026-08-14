// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Get a user as an admin.
 */
export interface IAdminUserGetRequest {
	/**
	 * The path parameters for the request.
	 */
	pathParams: {
		/**
		 * The user email.
		 */
		email: string;
	};
}
