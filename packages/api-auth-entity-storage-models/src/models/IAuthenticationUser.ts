// Copyright 2024 IOTA Stiftung.
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
	 * The user identity.
	 */
	userIdentity: string;

	/**
	 * The users organization.
	 */
	organizationIdentity: string;

	/**
	 * The scope assigned to the user, comma separated.
	 */
	scope: string[];
}
