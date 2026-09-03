// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IPasswordOptions } from "../IPasswordOptions.js";

/**
 * Get the password policy.
 */
export interface IPasswordPolicyResponse {
	/**
	 * The body of the response.
	 */
	body: IPasswordOptions;
}
