// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { OrganizationRequestStatus } from "../organizationRequestStatus.js";

/**
 * Count the requests to join an organization.
 */
export interface IOrganizationRequestCountRequest {
	/**
	 * The query parameters for the request.
	 */
	query: {
		/**
		 * The status of the requests to count.
		 */
		status: OrganizationRequestStatus;

		/**
		 * The organization of the requests to count, not named organization as the tenant processor
		 * reads that query parameter as the organization of the request.
		 */
		filterOrganization?: string;
	};
}
