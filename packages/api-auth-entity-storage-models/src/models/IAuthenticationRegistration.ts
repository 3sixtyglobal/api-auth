// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Fields accepted when a person signs up for a password account.
 */
export interface IAuthenticationRegistration {
	/**
	 * The e-mail address of the account.
	 */
	email: string;

	/**
	 * The password for the account.
	 */
	password: string;

	/**
	 * The given name, stored in the profile of the account.
	 */
	givenName?: string;

	/**
	 * The family name, stored in the profile of the account.
	 */
	familyName?: string;
}
