// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuthenticationAuditEntry } from "../IAuthenticationAuditEntry.js";

/**
 * Response from getting an authentication audit entry.
 */
export interface IAuditGetResponse {
	/**
	 * The response body.
	 */
	body: IAuthenticationAuditEntry;
}
