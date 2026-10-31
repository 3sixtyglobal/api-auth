// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Query the organizations.
 */
export interface IOrganizationQueryRequest {
	/**
	 * The query parameters for the request.
	 */
	query?: {
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
