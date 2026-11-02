// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Get the public data of the organization or account that holds a DID.
 */
export interface IAccountPublicIdentityGetRequest {
	/**
	 * The path parameters for the request.
	 */
	pathParams: {
		/**
		 * The DID.
		 */
		identity: string;
	};
}
