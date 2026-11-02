// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdNodeObject } from "@3sixty/data-json-ld";
import type { IOrganizationIdentityExport } from "./IOrganizationIdentityExport.js";

/**
 * The details of an organization the signed in account creates for itself.
 */
export interface IAccountOrganizationCreate {
	/**
	 * The file of an organization identity export, as exported, to import onto the node, controlled by
	 * the node, instead of creating a DID, so an organization moved from another node keeps its DID.
	 * Its revocation index carries on, and the node never goes below the index it reached when it
	 * last registered the DID.
	 */
	identityImport?: IOrganizationIdentityExport;

	/**
	 * The profile, such as a schema.org Organization.
	 */
	profile?: IJsonLdNodeObject;

	/**
	 * The logo, a schema.org ImageObject holding a data URL.
	 */
	logo?: IJsonLdNodeObject;

	/**
	 * The paths of the data that is public, such as profile.name or logo.
	 */
	publicData?: string[];
}
