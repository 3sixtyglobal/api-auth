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
	userId: string;

	/**
	 * The DID attached to the account, once one has been adopted.
	 */
	userIdentity?: string;

	/**
	 * The users organization.
	 */
	organizationIdentity: string;

	/**
	 * The scope assigned to the user, comma separated.
	 */
	scope: string[];
}
