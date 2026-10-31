// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Fields accepted when an admin creates a user. The service allocates the account id.
 */
export interface IAuthenticationUserCreate {
	/**
	 * The user e-mail address.
	 */
	email: string;

	/**
	 * Password for the new account.
	 */
	password: string;

	/**
	 * True to create the account disabled.
	 */
	disabled?: boolean;
}
