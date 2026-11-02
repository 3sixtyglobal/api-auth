// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IIdentityExport } from "@3sixty/identity-models";
import type { ExportFileType } from "./exportFileType.js";

/**
 * The export of the identity of an organization, with what the node needs to carry on issuing
 * membership credentials for it. It contains private keys and must be protected.
 */
export interface IOrganizationIdentityExport {
	/**
	 * The type of the file, checked first when it is imported.
	 */
	type: typeof ExportFileType.OrganizationIdentity;

	/**
	 * The version of the file.
	 */
	version: number;

	/**
	 * The identity with its private keys.
	 */
	identity: IIdentityExport;

	/**
	 * The revocation index to give the next membership credential the organization issues, so an
	 * import never gives a credential an index already used.
	 */
	nextRevocationIndex?: number;
}
