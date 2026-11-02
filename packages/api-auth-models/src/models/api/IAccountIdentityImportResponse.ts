// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IAccountIdentityImportResult } from "../IAccountIdentityImportResult.js";

/**
 * The result of importing an identity into the signed in account.
 */
export interface IAccountIdentityImportResponse {
	/**
	 * The response body.
	 */
	body: IAccountIdentityImportResult;
}
