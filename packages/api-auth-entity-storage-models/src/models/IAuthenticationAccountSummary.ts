// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The signed in account.
 */
export interface IAuthenticationAccountSummary {
	/**
	 * The account that is signed in, the token subject.
	 */
	accountId: string;

	/**
	 * The e-mail address of the account.
	 */
	email: string;

	/**
	 * The authentication provider the account signs in with.
	 */
	authProviderId: string;

	/**
	 * True when the authentication provider owns the profile, so it can only be edited with that provider.
	 */
	profileReadOnly: boolean;

	/**
	 * The address where the profile can be edited, when the authentication provider owns it.
	 */
	profileEditUrl?: string;

	/**
	 * The address where the password is changed, when the authentication provider manages it.
	 */
	passwordChangeUrl?: string;

	/**
	 * The DID of the account, when it has one.
	 */
	identity?: string;

	/**
	 * The organization DID of the account, when it has one.
	 */
	organization?: string;

	/**
	 * The roles the account holds.
	 */
	roles: string[];
}
