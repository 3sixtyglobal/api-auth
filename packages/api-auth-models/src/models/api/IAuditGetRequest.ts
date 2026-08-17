// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Get an authentication audit entry by id.
 */
export interface IAuditGetRequest {
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
