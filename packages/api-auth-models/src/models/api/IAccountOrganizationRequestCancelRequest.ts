// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Cancel the pending request of the signed in account to join an organization.
 */
export interface IAccountOrganizationRequestCancelRequest {
	/**
	 * The path parameters for the request.
	 */
	pathParams: {
		/**
		 * The DID of the organization whose request is cancelled.
		 */
		organization: string;
	};
}
