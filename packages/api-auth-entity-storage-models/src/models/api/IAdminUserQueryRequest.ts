// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Query the users as an admin.
 */
export interface IAdminUserQueryRequest {
	/**
	 * The query parameters for the request.
	 */
	query?: {
		/**
		 * The start of the e-mail address of the users to return.
		 */
		email?: string;

		/**
		 * True to match the e-mail address exactly rather than as a prefix.
		 */
		exactEmail?: string;

		/**
		 * The authentication provider of the users to return.
		 */
		authProviderId?: string;

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
