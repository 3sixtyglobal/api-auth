// Copyright 2024 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Contract definition for authentication user.
 */
export interface IAuthenticationUser {
	/**
	 * The user e-mail address.
	 */
	email: string;

	/**
	 * Stable identifier of the account. This is the token subject.
	 */
	accountId: string;

	/**
	 * The authentication provider the account signs in with.
	 */
	authProviderId?: string;

	/**
	 * When the account was created, in ISO date format.
	 */
	dateCreated?: string;

	/**
	 * When the account last logged in, in ISO date format.
	 */
	dateLastLogin?: string;

	/**
	 * When the account was disabled, in ISO date format, a disabled account cannot sign in.
	 */
	dateDisabled?: string;

	/**
	 * True when the account is disabled and cannot sign in.
	 */
	disabled?: boolean;

	/**
	 * False until the e-mail address of a self sign up is verified, absent means verified.
	 */
	verified?: boolean;

	/**
	 * The identity DID of the account, given when getting or updating a single user.
	 */
	userIdentity?: string;

	/**
	 * The organization DID of the account, given when getting or updating a single user.
	 */
	organizationIdentity?: string;
}
