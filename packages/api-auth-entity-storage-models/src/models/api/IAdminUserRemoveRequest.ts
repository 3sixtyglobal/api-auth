// Copyright 2026 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
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
		 * The user email, or the account id.
		 */
		email: string;
	};
}
