// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Get an item of account data.
 */
export interface IAccountDataGetRequest {
	/**
	 * The path parameters for the request.
	 */
	pathParams: {
		/**
		 * The unique identifier of the item.
		 */
		id: string;
	};
}
