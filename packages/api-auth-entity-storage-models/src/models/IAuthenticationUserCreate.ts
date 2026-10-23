// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Fields accepted when an admin creates a user.
 * The DID and the organisation may be omitted. The service allocates the account id and fills the organisation.
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
	 * DID to store on the account. When omitted, the account is created without one.
	 */
	userIdentity?: string;

	/**
	 * Organisation identity. When omitted, the service uses the organisation on the request context.
	 */
	organizationIdentity?: string;
}
