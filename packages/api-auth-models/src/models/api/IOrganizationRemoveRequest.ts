// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Remove an organization.
 */
export interface IOrganizationRemoveRequest {
	/**
	 * The path parameters for the request.
	 */
	pathParams: {
		/**
		 * The unique identifier or the DID of the organization.
		 */
		id: string;
	};
}
