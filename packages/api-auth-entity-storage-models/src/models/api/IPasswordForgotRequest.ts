// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Ask for a link to reset a forgotten password.
 */
export interface IPasswordForgotRequest {
	/**
	 * The body of the request.
	 */
	body: {
		/**
		 * The e-mail address of the account.
		 */
		email: string;
	};
}
