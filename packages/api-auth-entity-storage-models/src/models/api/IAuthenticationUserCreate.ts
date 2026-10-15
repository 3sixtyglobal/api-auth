// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Fields accepted when an admin creates a user.
 * The identity and the organisation may be omitted. The service fills them.
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
	 * The scope assigned to the user.
	 */
	scope: string[];

	/**
	 * Identity subject. When omitted, the service stores the e-mail address until a DID exists.
	 */
	userIdentity?: string;

	/**
	 * Organisation identity. When omitted, the service uses the organisation on the request context.
	 */
	organizationIdentity?: string;
}
