// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Get the public data of an account or organization.
 */
export interface IAccountPublicAccountGetRequest {
	/**
	 * The path parameters for the request.
	 */
	pathParams: {
		/**
		 * The account id, or the unique identifier or DID of an organization.
		 */
		accountId: string;
	};
}
