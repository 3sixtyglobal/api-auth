// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuthenticationAuditEntry } from "../IAuthenticationAuditEntry.js";

/**
 * Update an authentication audit entry.
 */
export interface IAuditUpdateRequest {
	/**
	 * The path parameters for the request.
	 */
	pathParams: {
		/**
		 * The audit entry id.
		 */
		id: string;
	};

	/**
	 * The body of the request.
	 */
	body: Partial<Omit<IAuthenticationAuditEntry, "id" | "dateCreated">>;
}
