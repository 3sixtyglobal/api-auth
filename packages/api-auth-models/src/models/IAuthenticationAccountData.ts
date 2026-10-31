// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * An item of data stored for an account.
 */
export interface IAuthenticationAccountData<T = unknown> {
	/**
	 * The unique identifier of the item.
	 */
	id: string;

	/**
	 * The account the item belongs to.
	 */
	accountId: string;

	/**
	 * The type of the item, such as identity or public-profile, stored in kebab case.
	 */
	type: string;

	/**
	 * The value of the item, a JSON object in the shape of its type.
	 */
	data: T;

	/**
	 * True for the item of its type to use first, otherwise the earliest created item is used.
	 */
	isDefault: boolean;

	/**
	 * When the item was created, in ISO date format.
	 */
	dateCreated: string;

	/**
	 * When the item was last modified, in ISO date format.
	 */
	dateModified: string;
}
