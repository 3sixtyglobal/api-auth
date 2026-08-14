// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Update the current user's password.
 */
export interface IUpdatePasswordRequest {
	/**
	 * The body of the request.
	 */
	body: {
		/**
		 * The current password for the user.
		 */
		currentPassword: string;

		/**
		 * The new password for the user.
		 */
		newPassword: string;
	};
}
