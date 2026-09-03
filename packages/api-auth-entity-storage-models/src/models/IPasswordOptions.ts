// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Password length validation options.
 */
export interface IPasswordOptions {
	/**
	 * The minimum password length for validation.
	 */
	minPasswordLength?: number;

	/**
	 * The maximum password length for validation.
	 */
	maxPasswordLength?: number;
}
