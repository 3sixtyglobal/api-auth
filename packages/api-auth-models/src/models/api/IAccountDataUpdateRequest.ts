// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Replace the value of an item of account data.
 */
export interface IAccountDataUpdateRequest {
	/**
	 * The path parameters for the request.
	 */
	pathParams: {
		/**
		 * The unique identifier of the item.
		 */
		id: string;
	};

	/**
	 * The new value.
	 */
	body: {
		/**
		 * The new value of the item, a JSON object in the shape of its type.
		 */
		data: unknown;

		/**
		 * True to use the item first for its type, clearing any other default, unchanged when omitted.
		 */
		isDefault?: boolean;
	};
}
