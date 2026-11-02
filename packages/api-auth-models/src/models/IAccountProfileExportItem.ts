// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * An item of account data in a profile export.
 */
export interface IAccountProfileExportItem {
	/**
	 * The type of the item.
	 */
	type: string;

	/**
	 * The value of the item, a JSON object.
	 */
	data: unknown;

	/**
	 * True when the item is used first for its type.
	 */
	isDefault?: boolean;

	/**
	 * When the item was created, for information, an imported item is created anew.
	 */
	dateCreated?: string;
}
