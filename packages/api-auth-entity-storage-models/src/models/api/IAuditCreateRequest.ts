// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuthenticationAuditEntry } from "../IAuthenticationAuditEntry.js";

/**
 * Create an authentication audit entry.
 */
export interface IAuditCreateRequest {
	/**
	 * The body of the request.
	 */
	body: Omit<IAuthenticationAuditEntry, "id" | "dateCreated">;
}
