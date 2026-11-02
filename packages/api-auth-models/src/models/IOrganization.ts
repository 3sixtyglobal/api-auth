// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdNodeObject } from "@3sixty/data-json-ld";

/**
 * An organization registered on the node.
 */
export interface IOrganization {
	/**
	 * The unique identifier of the organization.
	 */
	id: string;

	/**
	 * The DID of the organization.
	 */
	identity: string;

	/**
	 * The profile, such as a schema.org Organization, only for its members and admins.
	 */
	profile?: IJsonLdNodeObject;

	/**
	 * The logo, a schema.org ImageObject holding a data URL, only for its members and admins.
	 */
	logo?: IJsonLdNodeObject;

	/**
	 * The paths of the data that is public, only for its members and admins.
	 */
	publicData?: string[];

	/**
	 * The public data, a JSON-LD object for each type its public data paths name, for callers who
	 * are not its members or admins, and in a search, where the name is always included.
	 */
	public?: IJsonLdNodeObject[];

	/**
	 * True when the signed in caller is an org admin of the organization.
	 */
	isAdmin?: boolean;

	/**
	 * When the organization was created, in ISO date format.
	 */
	dateCreated: string;

	/**
	 * When the organization was last modified, in ISO date format.
	 */
	dateModified: string;
}
