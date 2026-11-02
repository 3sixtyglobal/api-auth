// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The identity and organization resolved for an account.
 */
export interface IAuthenticationAccountContext {
	/**
	 * The DID of the account.
	 */
	identity?: string;

	/**
	 * The organization DID of the account.
	 */
	organization?: string;
}
