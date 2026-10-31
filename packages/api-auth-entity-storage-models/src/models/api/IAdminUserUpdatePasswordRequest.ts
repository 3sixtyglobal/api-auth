// Copyright 2024 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Update a users password as an admin.
 */
export interface IAdminUserUpdatePasswordRequest {
	/**
	 * The path parameters for the request.
	 */
	pathParams: {
		/**
		 * The user email, or the account id.
		 */
		email: string;
	};

	/**
	 * The body of the request.
	 */
	body: {
		/**
		 * The new password for the user.
		 */
		newPassword: string;
	};
}
