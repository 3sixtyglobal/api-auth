// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IAccountProfileExport } from "../IAccountProfileExport.js";

/**
 * The account data of the signed in account.
 */
export interface IAccountProfileExportResponse {
	/**
	 * The response headers, the export is never cached.
	 */
	headers?: {
		/**
		 * Set to no-store.
		 */
		"cache-control"?: string;
	};

	/**
	 * The export.
	 */
	body: IAccountProfileExport;
}
