// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Query the items of any account.
 */
export interface IAccountDataAdminQueryRequest {
	/**
	 * The query parameters for the request.
	 */
	query?: {
		/**
		 * The account of the items to return.
		 */
		accountId?: string;

		/**
		 * The type of the items to return.
		 */
		type?: string;

		/**
		 * The pagination cursor.
		 */
		cursor?: string;

		/**
		 * The maximum number of results to return.
		 */
		limit?: string;
	};
}
