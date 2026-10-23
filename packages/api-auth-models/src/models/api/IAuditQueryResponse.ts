// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuthenticationAuditEntry } from "../IAuthenticationAuditEntry.js";

/**
 * Response from querying authentication audit entries.
 */
export interface IAuditQueryResponse {
	/**
	 * The response body.
	 */
	body: {
		/**
		 * The returned audit entries.
		 */
		entries: IAuthenticationAuditEntry[];

		/**
		 * The cursor to retrieve the next page, if any.
		 */
		cursor?: string;
	};
}
