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
	 * The profile shown to others, such as a schema.org Organization.
	 */
	publicProfile?: IJsonLdNodeObject;

	/**
	 * The profile only shown to the members and admins of the organization.
	 */
	privateProfile?: IJsonLdNodeObject;

	/**
	 * When the organization was created, in ISO date format.
	 */
	dateCreated: string;

	/**
	 * When the organization was last modified, in ISO date format.
	 */
	dateModified: string;
}
