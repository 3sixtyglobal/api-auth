// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Query the items of the signed in account.
 */
export interface IAccountDataQueryRequest {
	/**
	 * The query parameters for the request.
	 */
	query?: {
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
