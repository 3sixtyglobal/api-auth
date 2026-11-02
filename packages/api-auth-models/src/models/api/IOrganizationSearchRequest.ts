// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Search the organizations by name.
 */
export interface IOrganizationSearchRequest {
	/**
	 * The query parameters for the request.
	 */
	query: {
		/**
		 * The start of the name, without case.
		 */
		name: string;

		/**
		 * The maximum number of results to return.
		 */
		limit?: string;
	};
}
