// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The result of importing account data, which replaces the items of the types it may hold.
 */
export interface IAccountProfileImportResult {
	/**
	 * The number of items created from the import.
	 */
	itemsImported: number;

	/**
	 * The number of existing items removed.
	 */
	itemsRemoved: number;

	/**
	 * The types whose items in the import were left out, as the account holds a read only item of
	 * the type or the item was read only.
	 */
	skippedTypes: string[];
}
