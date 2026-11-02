// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IAccountProfileExport } from "../IAccountProfileExport.js";

/**
 * Replace the account data of an account with an export.
 */
export interface IAccountAdminProfileImportRequest {
	/**
	 * The path parameters for the request.
	 */
	pathParams: {
		/**
		 * The account.
		 */
		accountId: string;
	};

	/**
	 * The account profile export file, as exported.
	 */
	body: IAccountProfileExport;
}
