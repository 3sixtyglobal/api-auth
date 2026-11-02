// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The identity adopted by the signed in account.
 */
export interface IAccountIdentityAdoptResponse {
	/**
	 * The response body.
	 */
	body: {
		/**
		 * The DID of the account.
		 */
		identity: string;
	};
}
