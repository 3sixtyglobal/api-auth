// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IAccountProfileExport } from "../IAccountProfileExport.js";

/**
 * Replace the account data of the signed in account with an export.
 */
export interface IAccountProfileImportRequest {
	/**
	 * The export.
	 */
	body: IAccountProfileExport;
}
