// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The accounts the caller may manage.
 */
export interface IAccountAdminManagedResponse {
	/**
	 * The response body.
	 */
	body: {
		/**
		 * The account ids, omitted when the caller may manage every account.
		 */
		accountIds?: string[];
	};
}
