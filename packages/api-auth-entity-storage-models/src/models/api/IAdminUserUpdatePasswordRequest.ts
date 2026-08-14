// Copyright 2024 IOTA Stiftung.
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
		 * The user email.
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

		/**
		 * The current password for the user.
		 */
		currentPassword?: string;
	};
}
