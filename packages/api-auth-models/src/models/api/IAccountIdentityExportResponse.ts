// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IAccountIdentityExport } from "../IAccountIdentityExport.js";

/**
 * The identity of the signed in account with its private keys and credentials.
 */
export interface IAccountIdentityExportResponse {
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
	 * The export, which contains private keys and must be protected.
	 */
	body: IAccountIdentityExport;
}
