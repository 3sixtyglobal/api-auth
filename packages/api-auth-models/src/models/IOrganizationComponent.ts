// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IComponent } from "@3sixty/core";
import type { IOrganization } from "./IOrganization.js";
import type { IOrganizationCreate } from "./IOrganizationCreate.js";
import type { IOrganizationIdentityExport } from "./IOrganizationIdentityExport.js";
import type { IOrganizationMember } from "./IOrganizationMember.js";
import type { IOrganizationProfileUpdate } from "./IOrganizationProfileUpdate.js";

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
	 * Get an organization, the profile, logo and public data are only included for its members and
	 * admins, others get the public data.
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
	 * @returns The organizations with their names and the public properties of their profiles.
	 */
	search(
		name: string,
		limit?: number
	): Promise<{
		entities: IOrganization[];
	}>;

	/**
	 * Change the profile, logo and public data of an organization, those omitted are unchanged, its
	 * org admins and admins may.
	 * @param id The unique identifier or the DID of the organization.
	 * @param changes The profile, logo and public data.
	 * @returns A promise that resolves when the organization has been changed.
	 */
	update(id: string, changes: IOrganizationProfileUpdate): Promise<void>;

	/**
	 * Query the members of an organization, its members, org admins and admins may.
	 * @param id The unique identifier or the DID of the organization.
	 * @param cursor The cursor to request the next page.
	 * @param limit The maximum number of members to return.
	 * @returns The members and a cursor when there are more.
	 */
	queryMembers(
		id: string,
		cursor?: string,
		limit?: number
	): Promise<{
		entities: IOrganizationMember[];
		cursor?: string;
	}>;

	/**
	 * Make a member an org admin of an organization, its org admins and admins may.
	 * @param id The unique identifier or the DID of the organization.
	 * @param accountId The account of the member.
	 * @returns A promise that resolves when the member is an org admin.
	 */
	addAdmin(id: string, accountId: string): Promise<void>;

	/**
	 * Stop a member being an org admin of an organization, its org admins and admins may, only
	 * global admins may remove the last org admin.
	 * @param id The unique identifier or the DID of the organization.
	 * @param accountId The account of the member.
	 * @returns A promise that resolves when the member is no longer an org admin.
	 */
	removeAdmin(id: string, accountId: string): Promise<void>;

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
	 * Remove an organization that has no members, only admins may, or an org admin who is its only
	 * member, ending their membership.
	 * @param id The unique identifier or the DID of the organization.
	 * @returns A promise that resolves when the organization has been removed.
	 */
	remove(id: string): Promise<void>;
}
