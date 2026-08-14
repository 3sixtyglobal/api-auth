// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Get a user as an admin.
 */
export interface IAdminUserGetByIdentityRequest {
	/**
	 * The path parameters for the request.
	 */
	pathParams: {
		/**
		 * The user identity.
		 */
		identity: string;
	};
}
