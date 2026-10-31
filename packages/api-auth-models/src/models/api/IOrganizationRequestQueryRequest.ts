// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { OrganizationRequestStatus } from "../organizationRequestStatus.js";

/**
 * Query the requests to join an organization.
 */
export interface IOrganizationRequestQueryRequest {
	/**
	 * The query parameters for the request.
	 */
	query?: {
		/**
		 * The status of the requests to return.
		 */
		status?: OrganizationRequestStatus;

		/**
		 * The organization of the requests to return, not named organization as the tenant processor
		 * reads that query parameter as the organization of the request.
		 */
		filterOrganization?: string;

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
