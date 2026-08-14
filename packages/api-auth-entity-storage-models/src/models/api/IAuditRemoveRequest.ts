// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Remove an authentication audit entry.
 */
export interface IAuditRemoveRequest {
	/**
	 * The path parameters for the request.
	 */
	pathParams: {
		/**
		 * The audit entry id.
		 */
		id: string;
	};
}
