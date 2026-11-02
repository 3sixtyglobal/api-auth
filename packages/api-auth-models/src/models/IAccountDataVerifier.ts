// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Verifies the value of an account data item of one type before it is stored.
 */
export interface IAccountDataVerifier {
	/**
	 * Verify the value of an item, throwing when it is not valid for the type.
	 * @param data The value of the item.
	 * @param accountOwned True when the account sets the value itself, rather than an admin or an
	 * authentication provider.
	 * @returns A promise that resolves when the value is valid.
	 * @throws UnprocessableError when the value is not valid for the type.
	 */
	verify(data: unknown, accountOwned: boolean): Promise<void>;

	/**
	 * The most items of the type an account may hold. When it is one, a new item replaces the one the
	 * account holds, otherwise a new item is refused once the account holds that many.
	 * @returns The most items, or undefined for no limit other than the configured ones.
	 */
	maxInstances(): number | undefined;
}
