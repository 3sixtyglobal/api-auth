// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Reset a forgotten password with the token from the reset link.
 */
export interface IPasswordResetRequest {
	/**
	 * The body of the request.
	 */
	body: {
		/**
		 * The token from the reset link.
		 */
		token: string;

		/**
		 * The new password for the account.
		 */
		newPassword: string;
	};
}
