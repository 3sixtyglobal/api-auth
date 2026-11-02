// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IAccountIdentityExport } from "../IAccountIdentityExport.js";

/**
 * Import an identity into the signed in account, instead of adopting one.
 */
export interface IAccountIdentityImportRequest {
	/**
	 * The export of the identity and its credentials.
	 */
	body: IAccountIdentityExport;
}
