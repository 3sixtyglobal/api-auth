// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { AuthAuditEvent } from "../authAuditEvent.js";

/**
 * Query authentication audit entries.
 */
export interface IAuditQueryRequest {
	/**
	 * The query parameters for the request.
	 */
	query?: {
		/**
		 * The actor identifier to filter by.
		 */
		actorId?: string;

		/**
		 * The organization identifier to filter by.
		 */
		organizationId?: string;

		/**
		 * The tenant identifier to filter by.
		 */
		tenantId?: string;

		/**
		 * The node identifier to filter by.
		 */
		nodeId?: string;

		/**
		 * The event to filter by.
		 */
		event?: AuthAuditEvent | string;

		/**
		 * The inclusive start date for filtering, in ISO 8601 format.
		 */
		startDate?: string;

		/**
		 * The inclusive end date for filtering, in ISO 8601 format.
		 */
		endDate?: string;

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
