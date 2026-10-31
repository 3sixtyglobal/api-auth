// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuthenticationAccountSummary } from "../IAuthenticationAccountSummary.js";

/**
 * The signed in account.
 */
export interface IMeResponse {
	/**
	 * The account details.
	 */
	body: IAuthenticationAccountSummary;
}
