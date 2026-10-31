// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IComponent } from "@3sixty/core";
import type { IJsonLdNodeObject } from "@3sixty/data-json-ld";
import type { IOrganization } from "./IOrganization.js";
import type { IOrganizationCreate } from "./IOrganizationCreate.js";
import type { IOrganizationIdentityExport } from "./IOrganizationIdentityExport.js";

/**
 * Contract for the organizations registered on the node.
 */
export interface IOrganizationComponent extends IComponent {
	/**
	 * Create an organization, only admins may.
	 * @param organization The details of the organization.
	 * @returns The organization.
	 */
	create(organization: IOrganizationCreate): Promise<IOrganization>;

	/**
	 * Get an organization, the private profile is only included for its members and admins.
	 * @param id The unique identifier or the DID of the organization.
	 * @returns The organization.
	 */
	get(id: string): Promise<IOrganization>;

	/**
	 * Query the organizations, the earliest first, only admins may.
	 * @param cursor The cursor to request the next page.
	 * @param limit The maximum number of organizations to return.
	 * @returns The organizations, without their profiles, and a cursor when there are more.
	 */
	query(
		cursor?: string,
		limit?: number
	): Promise<{
		entities: IOrganization[];
		cursor?: string;
	}>;

	/**
	 * Search the organizations whose name starts with the text given, without case, any signed in
	 * account may.
	 * @param name The start of the name.
	 * @param limit The maximum number of organizations to return.
	 * @returns The organizations with their public profiles.
	 */
	search(
		name: string,
		limit?: number
	): Promise<{
		entities: IOrganization[];
	}>;

	/**
	 * Replace the profiles of an organization, the profiles omitted are unchanged, only admins may.
	 * @param id The unique identifier or the DID of the organization.
	 * @param publicProfile The profile shown to others.
	 * @param privateProfile The profile only shown to the members and admins.
	 * @returns A promise that resolves when the profiles have been replaced.
	 */
	update(
		id: string,
		publicProfile?: IJsonLdNodeObject,
		privateProfile?: IJsonLdNodeObject
	): Promise<void>;

	/**
	 * Export the identity of an organization with its private keys, only admins may, and only for
	 * an organization whose keys the node holds.
	 * @param id The unique identifier or the DID of the organization.
	 * @param sessionStart When the session of the caller started in seconds, it must be recent.
	 * @returns The export with the revocation index the organization reached, which contains private
	 * keys and must be protected.
	 */
	exportIdentity(id: string, sessionStart?: number): Promise<IOrganizationIdentityExport>;

	/**
	 * Remove an organization that has no members, only admins may.
	 * @param id The unique identifier or the DID of the organization.
	 * @returns A promise that resolves when the organization has been removed.
	 */
	remove(id: string): Promise<void>;
}
