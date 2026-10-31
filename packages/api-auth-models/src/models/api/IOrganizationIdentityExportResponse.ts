// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IOrganizationIdentityExport } from "../IOrganizationIdentityExport.js";

/**
 * The identity of an organization with its private keys.
 */
export interface IOrganizationIdentityExportResponse {
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
	body: IOrganizationIdentityExport;
}
