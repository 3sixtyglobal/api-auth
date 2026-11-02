// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IIdentityExport } from "@3sixty/identity-models";
import type { ExportFileType } from "./exportFileType.js";

/**
 * The identity of an account with the credentials it holds, to move it to another account or node.
 * It contains private keys and must be protected.
 */
export interface IAccountIdentityExport {
	/**
	 * The type of the file, checked first when it is imported.
	 */
	type: typeof ExportFileType.AccountIdentity;

	/**
	 * The version of the file.
	 */
	version: number;

	/**
	 * The identity with its private keys.
	 */
	identity: IIdentityExport;

	/**
	 * The verifiable credentials held by the account, JSON credential objects with an embedded proof.
	 */
	credentials?: unknown[];
}
