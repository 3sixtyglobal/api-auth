// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import {
	AuthenticationAccountDataType,
	AuthenticationAccountHelper,
	type IAuthenticationAccountData
} from "@3sixty/api-auth-models";
import { ContextIdKeys, ContextIdStore } from "@3sixty/context";
import { Guards, Is } from "@3sixty/core";
import type { IEntityStorageConnector } from "@3sixty/entity-storage-models";
import type { IIdentityComponent } from "@3sixty/identity-models";
import { nameof } from "@3sixty/nameof";
import { AccountDataHelper } from "./accountDataHelper.js";
import { OrganizationMembershipHelper } from "./organizationMembershipHelper.js";
import { OrganizationRequestHelper } from "./organizationRequestHelper.js";
import type { AccountData } from "../entities/accountData.js";
import type { OrganizationRequest } from "../entities/organizationRequest.js";

/**
 * Helper class for removing an account from its organizations. Membership grants no role, the role
 * given to the creator of an organization applies to every organization of the tenant, so no role
 * is removed.
 */
export class MembershipRemovalHelper {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<MembershipRemovalHelper>();

	/**
	 * Remove an account from an organization, removing its organization items and the membership
	 * credentials the organization issued it. Only a credential that verifies in full, is issued by
	 * the organization and names the identity of the account as a member counts as a membership
	 * credential, other credentials the account stored are left. Only the revocation indexes the node
	 * recorded when it issued the credentials of the organization items are revoked, never an index
	 * read from a stored credential.
	 * @param storage The entity storage for account data.
	 * @param identityComponent The identity component that verifies and revokes credentials.
	 * @param accountId The account id.
	 * @param organization The DID of the organization.
	 * @param preloaded The account data and node the caller has already read, read here when omitted.
	 * @param preloaded.identity The DID of the account.
	 * @param preloaded.organizations The organization items of the account.
	 * @param preloaded.credentials The credential items of the account.
	 * @param preloaded.nodeIdentity The DID of the node, which signs the revocation.
	 * @returns True when the account held an organization item or membership credential for the organization.
	 */
	public static async leave(
		storage: IEntityStorageConnector<AccountData>,
		identityComponent: IIdentityComponent,
		accountId: string,
		organization: string,
		preloaded?: {
			identity?: string;
			organizations: IAuthenticationAccountData[];
			credentials: IAuthenticationAccountData[];
			nodeIdentity?: string;
		}
	): Promise<boolean> {
		Guards.stringValue(MembershipRemovalHelper.CLASS_NAME, nameof(accountId), accountId);
		Guards.stringValue(MembershipRemovalHelper.CLASS_NAME, nameof(organization), organization);

		const loaded = preloaded ?? (await MembershipRemovalHelper.load(storage, accountId));
		const organizationItems = loaded.organizations.filter(
			item => AuthenticationAccountHelper.getOrganization(item.data) === organization
		);
		const credentialItems: IAuthenticationAccountData[] = [];
		if (Is.stringValue(loaded.identity)) {
			for (const item of loaded.credentials) {
				const credential = AuthenticationAccountHelper.getCredential(item.data);
				if (
					Is.object(credential) &&
					OrganizationMembershipHelper.claimsIssuer(credential, organization) &&
					(await OrganizationMembershipHelper.isValidMembership(
						identityComponent,
						credential,
						organization,
						loaded.identity
					))
				) {
					credentialItems.push(item);
				}
			}
		}
		if (organizationItems.length === 0 && credentialItems.length === 0) {
			return false;
		}

		for (const item of organizationItems) {
			const revocationIndex = await AccountDataHelper.getRevocationIndex(storage, item.id);
			if (Is.integer(revocationIndex)) {
				await OrganizationMembershipHelper.revokeIndex(
					identityComponent,
					organization,
					revocationIndex,
					loaded.nodeIdentity
				);
			}
		}
		for (const item of credentialItems) {
			await AccountDataHelper.removeItem(storage, item);
		}
		for (const item of organizationItems) {
			await AccountDataHelper.removeItem(storage, item);
		}
		return true;
	}

	/**
	 * Remove an account from every organization, revoking the membership credentials the node
	 * issued, then remove its credentials, organizations and identity items, and its pending
	 * requests to join an organization. The keys of the identity are not removed here.
	 * @param storage The entity storage for account data.
	 * @param requestStorage The entity storage for the requests to join an organization.
	 * @param identityComponent The identity component that verifies and revokes credentials.
	 * @param accountId The account id.
	 * @returns A promise that resolves when the items have been removed.
	 */
	public static async removeAll(
		storage: IEntityStorageConnector<AccountData>,
		requestStorage: IEntityStorageConnector<OrganizationRequest>,
		identityComponent: IIdentityComponent,
		accountId: string
	): Promise<void> {
		Guards.stringValue(MembershipRemovalHelper.CLASS_NAME, nameof(accountId), accountId);

		// The account data is read once for every organization.
		const loaded = await MembershipRemovalHelper.load(storage, accountId);
		for (const organization of new Set(
			loaded.organizations.map(item => AuthenticationAccountHelper.getOrganization(item.data))
		)) {
			if (Is.stringValue(organization)) {
				await MembershipRemovalHelper.leave(
					storage,
					identityComponent,
					accountId,
					organization,
					loaded
				);
			}
		}
		for (const type of [
			AuthenticationAccountDataType.VerifiableCredential,
			AuthenticationAccountDataType.Organization,
			AuthenticationAccountDataType.Identity
		]) {
			await MembershipRemovalHelper.removeAllOfType(storage, accountId, type);
		}
		const pending = await OrganizationRequestHelper.findAllPending(requestStorage, accountId);
		for (const request of pending) {
			await requestStorage.remove(request.id);
		}
	}

	/**
	 * Read every credential item of an account.
	 * @param storage The entity storage for account data.
	 * @param accountId The account id.
	 * @returns The credential items.
	 */
	public static async loadCredentialItems(
		storage: IEntityStorageConnector<AccountData>,
		accountId: string
	): Promise<IAuthenticationAccountData[]> {
		return MembershipRemovalHelper.loadAllOfType(
			storage,
			accountId,
			AuthenticationAccountDataType.VerifiableCredential
		);
	}

	/**
	 * Read the account data and node used to remove an account from its organizations.
	 * @param storage The entity storage for account data.
	 * @param accountId The account id.
	 * @returns The identity, organization items and credential items of the account, and the node.
	 * @internal
	 */
	private static async load(
		storage: IEntityStorageConnector<AccountData>,
		accountId: string
	): Promise<{
		identity?: string;
		organizations: IAuthenticationAccountData[];
		credentials: IAuthenticationAccountData[];
		nodeIdentity?: string;
	}> {
		const [identity, organizations, credentials, contextIds] = await Promise.all([
			OrganizationMembershipHelper.loadIdentity(storage, accountId),
			OrganizationMembershipHelper.loadOrganizations(storage, accountId),
			MembershipRemovalHelper.loadCredentialItems(storage, accountId),
			ContextIdStore.getContextIds()
		]);
		return { identity, organizations, credentials, nodeIdentity: contextIds?.[ContextIdKeys.Node] };
	}

	/**
	 * Read every item of a type of an account.
	 * @param storage The entity storage for account data.
	 * @param accountId The account id.
	 * @param type The type of the items.
	 * @returns The items.
	 * @internal
	 */
	private static async loadAllOfType(
		storage: IEntityStorageConnector<AccountData>,
		accountId: string,
		type: string
	): Promise<IAuthenticationAccountData[]> {
		const items: IAuthenticationAccountData[] = [];
		let cursor: string | undefined;
		do {
			const page = await AccountDataHelper.query(storage, accountId, type, cursor);
			items.push(...page.entities);
			cursor = page.cursor;
		} while (Is.stringValue(cursor));
		return items;
	}

	/**
	 * Remove every item of a type of an account, reading every page before removing any, as removing
	 * changes the pages a cursor would return.
	 * @param storage The entity storage for account data.
	 * @param accountId The account id.
	 * @param type The type of the items.
	 * @returns A promise that resolves when the items have been removed.
	 * @internal
	 */
	private static async removeAllOfType(
		storage: IEntityStorageConnector<AccountData>,
		accountId: string,
		type: string
	): Promise<void> {
		const items = await MembershipRemovalHelper.loadAllOfType(storage, accountId, type);
		for (const item of items) {
			await AccountDataHelper.removeItem(storage, item);
		}
	}
}
