// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IComponent } from "@3sixty/core";
import type { IProof } from "@3sixty/standards-w3c-did";
import type { IAccountIdentityExport } from "./IAccountIdentityExport.js";
import type { IAccountIdentityImportResult } from "./IAccountIdentityImportResult.js";
import type { IAccountProfileExport } from "./IAccountProfileExport.js";
import type { IAccountProfileImportResult } from "./IAccountProfileImportResult.js";
import type { IAuthenticationAccountData } from "./IAuthenticationAccountData.js";

/**
 * Contract for managing the data stored for any account.
 */
export interface IAuthenticationAccountAdminComponent extends IComponent {
	/**
	 * Store an item for an account.
	 * @param accountId The account to store the item for.
	 * @param type The type of the item.
	 * @param data The value of the item.
	 * @param isDefault True to use the item first for its type, clearing any other default.
	 * @param proof A proof by the DID over the identity proof document, required when a caller
	 * without escalated privilege stores an identity.
	 * @param adminOnly True when only admins may see and change the item.
	 * @returns The unique identifier of the item.
	 */
	create(
		accountId: string,
		type: string,
		data: unknown,
		isDefault?: boolean,
		proof?: IProof,
		adminOnly?: boolean
	): Promise<string>;

	/**
	 * Get an item.
	 * @param id The unique identifier of the item.
	 * @returns The item.
	 * @throws NotFoundError when the item does not exist.
	 */
	get(id: string): Promise<IAuthenticationAccountData>;

	/**
	 * Replace the value of an item.
	 * @param id The unique identifier of the item.
	 * @param data The new value of the item.
	 * @param isDefault True to use the item first for its type, clearing any other default, unchanged when omitted.
	 * @param adminOnly True when only admins may see and change the item, unchanged when omitted.
	 * @returns A promise that resolves when the item has been updated.
	 * @throws NotFoundError when the item does not exist.
	 */
	update(id: string, data: unknown, isDefault?: boolean, adminOnly?: boolean): Promise<void>;

	/**
	 * Get the accounts the caller may manage, callers without escalated privilege only manage the
	 * members of the organizations they are an org admin of.
	 * @returns The account ids, or undefined when the caller may manage every account.
	 */
	getManagedAccounts(): Promise<string[] | undefined>;

	/**
	 * Get the roles of an account the caller manages.
	 * @param accountId The account.
	 * @returns The roles.
	 * @throws NotFoundError when the caller does not manage the account.
	 */
	getRoles(accountId: string): Promise<string[]>;

	/**
	 * Get the roles the caller may grant and revoke, every role for a caller holding escalated
	 * privilege, otherwise the roles it holds other than the escalated privilege role. The org admin
	 * roles are never included, they are managed through the organization.
	 * @returns The roles.
	 */
	getAssignableRoles(): Promise<string[]>;

	/**
	 * Grant a role to an account the caller manages.
	 * @param accountId The account.
	 * @param role The role.
	 * @returns A promise that resolves when the role has been granted.
	 * @throws NotFoundError when the caller does not manage the account.
	 * @throws ForbiddenError when the caller may not grant the role to the account.
	 * @throws UnprocessableError when the role is an org admin role.
	 */
	addRole(accountId: string, role: string): Promise<void>;

	/**
	 * Revoke a role of an account the caller manages.
	 * @param accountId The account.
	 * @param role The role.
	 * @returns A promise that resolves when the role has been revoked.
	 * @throws NotFoundError when the caller does not manage the account.
	 * @throws ForbiddenError when the caller may not revoke the role of the account.
	 * @throws UnprocessableError when the role is an org admin role.
	 * @throws ConflictError when the escalated privilege role is revoked from its last holder.
	 */
	removeRole(accountId: string, role: string): Promise<void>;

	/**
	 * Remove an item.
	 * @param id The unique identifier of the item.
	 * @returns A promise that resolves when the item has been removed.
	 * @throws NotFoundError when the item does not exist.
	 */
	remove(id: string): Promise<void>;

	/**
	 * Create a self-controlled identity with keys the node holds for an account that has none, as
	 * the account does itself.
	 * @param accountId The account.
	 * @returns The DID of the account.
	 * @throws ConflictError when the account already has an identity.
	 */
	createIdentity(accountId: string): Promise<string>;

	/**
	 * Export the identity of an account with its private keys and the credentials it holds, which
	 * needs a recent sign in by the caller.
	 * @param accountId The account.
	 * @param sessionStart When the session of the caller started in seconds, it must be recent.
	 * @returns The export, which contains private keys and must be protected.
	 * @throws NotFoundError when the account has no identity.
	 * @throws UnprocessableError when the node does not hold the keys of the identity.
	 */
	exportIdentity(accountId: string, sessionStart?: number): Promise<IAccountIdentityExport>;

	/**
	 * Import a self-controlled identity into an account that has none, as the account does itself.
	 * @param accountId The account.
	 * @param exported The account identity export file.
	 * @returns The DID and what was imported.
	 * @throws UnprocessableError when the file is not an account identity export or is not valid.
	 * @throws ConflictError when the account already has an identity, or the DID is held.
	 */
	importIdentity(
		accountId: string,
		exported: IAccountIdentityExport
	): Promise<IAccountIdentityImportResult>;

	/**
	 * Export the account data of an account, as the account does itself.
	 * @param accountId The account.
	 * @returns The export.
	 */
	exportProfile(accountId: string): Promise<IAccountProfileExport>;

	/**
	 * Replace the account data of an account with an export, as the account does itself.
	 * @param accountId The account.
	 * @param profile The account profile export file.
	 * @returns What was imported and removed.
	 * @throws UnprocessableError when the file is not an account profile export or is not valid.
	 */
	importProfile(
		accountId: string,
		profile: IAccountProfileExport
	): Promise<IAccountProfileImportResult>;

	/**
	 * Query the items of any account.
	 * @param accountId The account of the items to return, all accounts when omitted.
	 * @param type The type of the items to return, all types when omitted.
	 * @param cursor The cursor to request the next page.
	 * @param limit The maximum number of items to return.
	 * @returns The items and a cursor when there are more.
	 */
	query(
		accountId?: string,
		type?: string,
		cursor?: string,
		limit?: number
	): Promise<{
		entities: IAuthenticationAccountData[];
		cursor?: string;
	}>;
}
