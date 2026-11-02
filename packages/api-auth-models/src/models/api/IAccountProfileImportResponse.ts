// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IAccountProfileImportResult } from "../IAccountProfileImportResult.js";

/**
 * The result of importing account data into the signed in account.
 */
export interface IAccountProfileImportResponse {
	/**
	 * The response body.
	 */
	body: IAccountProfileImportResult;
}
