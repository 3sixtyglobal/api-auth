// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Store an item for the signed in account.
 */
export interface IAccountDataCreateRequest {
	/**
	 * The item to store.
	 */
	body: {
		/**
		 * The type of the item.
		 */
		type: string;

		/**
		 * The value of the item, a JSON object in the shape of its type.
		 */
		data: unknown;

		/**
		 * True to use the item first for its type, clearing any other default.
		 */
		isDefault?: boolean;
	};
}
