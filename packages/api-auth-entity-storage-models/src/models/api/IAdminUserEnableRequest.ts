// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Enable a disabled user as an admin.
 */
export interface IAdminUserEnableRequest {
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
