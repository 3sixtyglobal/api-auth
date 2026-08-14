// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuthenticationUser } from "./IAuthenticationUser.js";

/**
 * Contract definition for authentication user.
 */
export interface IAuthenticationUserSecure extends IAuthenticationUser {
	/**
	 * The encrypted password for the user.
	 */
	password: string;

	/**
	 * The salt for the password.
	 */
	salt: string;

	/**
	 * The tenant ID associated with the user, optional in single tenant contexts.
	 */
	tenantId: string;
}
