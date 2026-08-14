// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Remove a user as an admin.
 */
export interface IAdminUserRemoveRequest {
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
