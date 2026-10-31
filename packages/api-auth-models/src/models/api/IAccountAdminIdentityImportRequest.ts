// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IAccountIdentityExport } from "../IAccountIdentityExport.js";

/**
 * Import an identity into an account that has none.
 */
export interface IAccountAdminIdentityImportRequest {
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
	 * The account identity export file, as exported.
	 */
	body: IAccountIdentityExport;
}
