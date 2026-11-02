// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Disable a user as an admin, so it cannot sign in.
 */
export interface IAdminUserDisableRequest {
	/**
	 * The path parameters for the request.
	 */
	pathParams: {
		/**
		 * The user email, or the account id.
		 */
		email: string;
	};
}
