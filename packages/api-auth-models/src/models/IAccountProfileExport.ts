// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { ExportFileType } from "./exportFileType.js";
import type { IAccountProfileExportItem } from "./IAccountProfileExportItem.js";

/**
 * The account data of an account, other than its identity, organizations, credentials and node
 * migration records, which move with the identity export.
 */
export interface IAccountProfileExport {
	/**
	 * The type of the file, checked first when it is imported.
	 */
	type: typeof ExportFileType.AccountProfile;

	/**
	 * The version of the file.
	 */
	version: number;

	/**
	 * The items in the order they were created.
	 */
	items: IAccountProfileExportItem[];
}
