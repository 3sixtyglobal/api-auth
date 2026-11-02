// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuthenticationRegistration } from "../IAuthenticationRegistration.js";

/**
 * Sign up for a password account.
 */
export interface IRegisterRequest {
	/**
	 * The details of the account.
	 */
	body: IAuthenticationRegistration;
}
