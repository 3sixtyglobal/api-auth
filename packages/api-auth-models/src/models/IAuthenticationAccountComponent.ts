// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IComponent } from "@3sixty/core";
import type { IProof } from "@3sixty/standards-w3c-did";
import type { IAccountIdentityExport } from "./IAccountIdentityExport.js";
import type { IAccountIdentityImportResult } from "./IAccountIdentityImportResult.js";
import type { IAccountProfileExport } from "./IAccountProfileExport.js";
import type { IAccountProfileImportResult } from "./IAccountProfileImportResult.js";
import type { IAuthenticationAccountData } from "./IAuthenticationAccountData.js";
import type { IOrganizationRequest } from "./IOrganizationRequest.js";

/**
 * Contract for the data stored for the signed in account.
 * The identity and organization types are only set through adoptIdentity and joinOrganization, and
 * verifiable credentials by the node.
 */
export interface IAuthenticationAccountComponent extends IComponent {
	/**
	 * Adopt an identity for the signed in account, an account has only one.
	 * @param identity The DID to adopt, a new self-controlled DID is created when omitted.
	 * @param proof A proof by the DID over the identity proof document, required with the identity.
	 * @param sessionStart When the session of the caller started in seconds, it must be recent.
	 * @returns The DID of the account.
	 * @throws ConflictError when the account already has an identity or the DID is in use.
	 * @throws UnauthorizedError when the proof does not show the DID is owned by the caller, or the
	 * session did not start recently.
	 */
	adoptIdentity(identity?: string, proof?: IProof, sessionStart?: number): Promise<string>;

	/**
	 * Export the identity of the signed in account with its private keys and the credentials the
	 * account holds, only when the node holds the keys of the identity.
	 * @param sessionStart When the session of the caller started in seconds, it must be recent.
	 * @returns The export, which contains private keys and must be protected.
	 * @throws UnauthorizedError when the session did not start recently.
	 * @throws NotFoundError when the account has no identity.
	 * @throws UnprocessableError when the node does not hold the keys of the identity.
	 */
	exportIdentity(sessionStart?: number): Promise<IAccountIdentityExport>;

	/**
	 * Import a self-controlled identity into the signed in account, instead of adopting one. The
	 * credentials that verify and are issued to the identity are stored, and the account becomes a
	 * member of the registered organizations whose revocable membership credentials it holds.
	 * @param exported The export of the identity and its credentials.
	 * @param sessionStart When the session of the caller started in seconds, it must be recent.
	 * @returns The DID and what was imported.
	 * @throws ConflictError when the account already has an identity, or the DID is held.
	 * @throws UnauthorizedError when the session did not start recently.
	 */
	importIdentity(
		exported: IAccountIdentityExport,
		sessionStart?: number
	): Promise<IAccountIdentityImportResult>;

	/**
	 * Remove the identity of the signed in account with its credentials, organizations and pending
	 * requests to join one, and remove the keys the node holds for it.
	 * @param sessionStart When the session of the caller started in seconds, it must be recent.
	 * @returns A promise that resolves when the identity has been removed.
	 * @throws UnauthorizedError when the session did not start recently.
	 * @throws NotFoundError when the account has no identity.
	 */
	removeIdentity(sessionStart?: number): Promise<void>;

	/**
	 * Leave an organization with the signed in account, removing the organization and the
	 * membership credentials it issued.
	 * @param organization The DID of the organization.
	 * @returns A promise that resolves when the account has left.
	 * @throws NotFoundError when the account is not in the organization.
	 */
	leaveOrganization(organization: string): Promise<void>;

	/**
	 * Export the account data of the signed in account, other than its identity, organizations,
	 * credentials and node migration records.
	 * @returns The export.
	 */
	exportProfile(): Promise<IAccountProfileExport>;

	/**
	 * Replace the account data of the signed in account with an export, the types the export may
	 * hold are replaced, items owned by an authentication provider are kept.
	 * @param profile The export.
	 * @returns What was imported and removed.
	 * @throws UnprocessableError when the export is not valid or too large.
	 */
	importProfile(profile: IAccountProfileExport): Promise<IAccountProfileImportResult>;

	/**
	 * Ask to join an organization with the signed in account, an admin accepts or rejects the request.
	 * @param organization The DID of the organization to join.
	 * @returns A promise that resolves when the request has been made.
	 * @throws UnprocessableError when the account has no identity.
	 * @throws ConflictError when the account is already in the organization or has a request pending.
	 */
	joinOrganization(organization: string): Promise<void>;

	/**
	 * Get the organization of the signed in account.
	 * @returns The DID of the organization, or undefined while there is none or a request is pending.
	 * @throws UnprocessableError when the account has no organization and its latest request to join
	 * one was rejected, with the organization and the i18n key of the reason.
	 */
	getOrganization(): Promise<string | undefined>;

	/**
	 * Cancel the pending request of the signed in account to join an organization. The requests
	 * answered before are kept, so the latest of them is the status again.
	 * @returns A promise that resolves when the request has been cancelled.
	 * @throws NotFoundError when no request is pending.
	 */
	cancelOrganizationRequest(): Promise<void>;

	/**
	 * Get the request of the signed in account to join an organization, so its status can be shown.
	 * @returns The pending request, otherwise the latest request, or undefined when none was made.
	 */
	getOrganizationRequest(): Promise<IOrganizationRequest | undefined>;

	/**
	 * Store an item for the signed in account.
	 * @param type The type of the item.
	 * @param data The value of the item.
	 * @param isDefault True to use the item first for its type, clearing any other default.
	 * @returns The unique identifier of the item.
	 */
	create(type: string, data: unknown, isDefault?: boolean): Promise<string>;

	/**
	 * Get an item of the signed in account.
	 * @param id The unique identifier of the item.
	 * @returns The item.
	 * @throws NotFoundError when the item does not exist or belongs to another account.
	 */
	get(id: string): Promise<IAuthenticationAccountData>;

	/**
	 * Replace the value of an item of the signed in account.
	 * @param id The unique identifier of the item.
	 * @param data The new value of the item.
	 * @param isDefault True to use the item first for its type, clearing any other default, unchanged when omitted.
	 * @returns A promise that resolves when the item has been updated.
	 * @throws NotFoundError when the item does not exist or belongs to another account.
	 */
	update(id: string, data: unknown, isDefault?: boolean): Promise<void>;

	/**
	 * Remove an item of the signed in account.
	 * @param id The unique identifier of the item.
	 * @returns A promise that resolves when the item has been removed.
	 * @throws NotFoundError when the item does not exist or belongs to another account.
	 */
	remove(id: string): Promise<void>;

	/**
	 * Query the items of the signed in account.
	 * @param type The type of the items to return, all types when omitted.
	 * @param cursor The cursor to request the next page.
	 * @param limit The maximum number of items to return.
	 * @returns The items and a cursor when there are more.
	 */
	query(
		type?: string,
		cursor?: string,
		limit?: number
	): Promise<{
		entities: IAuthenticationAccountData[];
		cursor?: string;
	}>;
}
