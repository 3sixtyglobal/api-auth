// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuthenticationAccountData } from "../IAuthenticationAccountData.js";

/**
 * The item of account data.
 */
export interface IAccountDataGetResponse {
	/**
	 * The item.
	 */
	body: IAuthenticationAccountData;
}
