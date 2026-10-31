// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The organization of the signed in account.
 */
export interface IAccountOrganizationGetResponse {
	/**
	 * The response body.
	 */
	body: {
		/**
		 * The DID of the organization, absent while there is none or a request is pending.
		 */
		organization?: string;
	};
}
