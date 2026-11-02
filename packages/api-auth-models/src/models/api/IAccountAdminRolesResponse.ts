// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * A list of roles.
 */
export interface IAccountAdminRolesResponse {
	/**
	 * The response body.
	 */
	body: {
		/**
		 * The roles.
		 */
		roles: string[];
	};
}
