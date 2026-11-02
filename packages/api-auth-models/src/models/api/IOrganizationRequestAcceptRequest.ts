// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Accept a request to join an organization.
 */
export interface IOrganizationRequestAcceptRequest {
	/**
	 * The path parameters for the request.
	 */
	pathParams: {
		/**
		 * The unique identifier of the request.
		 */
		id: string;
	};
}
