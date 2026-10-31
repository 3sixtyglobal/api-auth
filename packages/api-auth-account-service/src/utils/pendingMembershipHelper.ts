// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import {
	AuthenticationAccountDataType,
	AuthenticationAccountHelper
} from "@3sixty/api-auth-models";
import { BaseError, Is } from "@3sixty/core";
import type { IEntityStorageConnector } from "@3sixty/entity-storage-models";
import type { IIdentityComponent } from "@3sixty/identity-models";
import type { ILoggingComponent } from "@3sixty/logging-models";
import { nameof } from "@3sixty/nameof";
import { AccountDataHelper } from "./accountDataHelper.js";
import { OrganizationMembershipHelper } from "./organizationMembershipHelper.js";
import type { AccountData } from "../entities/accountData.js";

/**
 * Helper class for adding accounts to organizations before they have an identity, the membership
 * credential is issued when the identity is bound.
 */
export class PendingMembershipHelper {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<PendingMembershipHelper>();

	/**
	 * Add an account to an organization, issuing the membership credential now when the account has
	 * an identity, otherwise storing only the organization.
	 * @param storage The entity storage for account data.
	 * @param identityComponent The identity component that issues the credential, when it exists.
	 * @param verificationMethodId The verification method of the organization that signs the credential.
	 * @param accountId The account to add.
	 * @param organization The DID of the organization.
	 * @param isDefault True to make it the default organization of the account.
	 * @param organizationEntityStorageType The entity storage type of the registered organizations.
	 * @returns The unique identifier of the organization item.
	 */
	public static async add(
		storage: IEntityStorageConnector<AccountData>,
		identityComponent: IIdentityComponent | undefined,
		verificationMethodId: string,
		accountId: string,
		organization: string,
		isDefault?: boolean,
		organizationEntityStorageType?: string
	): Promise<string> {
		const identity = await OrganizationMembershipHelper.loadIdentity(storage, accountId);
		if (Is.stringValue(identity) && Is.object(identityComponent)) {
			return OrganizationMembershipHelper.join(
				storage,
				identityComponent,
				verificationMethodId,
				accountId,
				organization,
				isDefault,
				{ identity },
				organizationEntityStorageType
			);
		}

		const organizations = await OrganizationMembershipHelper.loadOrganizations(storage, accountId);
		const existing = organizations.find(
			item => AuthenticationAccountHelper.getOrganization(item.data) === organization
		);
		if (!Is.object(existing)) {
			return AccountDataHelper.create(
				storage,
				accountId,
				AuthenticationAccountDataType.Organization,
				AuthenticationAccountHelper.createOrganizationData(organization),
				isDefault ?? organizations.length === 0
			);
		}
		if (isDefault === true && !existing.isDefault) {
			await AccountDataHelper.updateItem(storage, existing, existing.data, true);
		}
		return existing.id;
	}

	/**
	 * Issue the membership credentials of the organizations an account was added to before it had
	 * an identity. A failure for one organization does not stop the others, its membership stays
	 * without a credential, so it is completed again the next time, and the failure is logged.
	 * @param storage The entity storage for account data.
	 * @param identityComponent The identity component that issues the credentials.
	 * @param verificationMethodId The verification method of the organization that signs the credential.
	 * @param accountId The account id.
	 * @param identity The DID just bound to the account, read when omitted.
	 * @param options The optional settings.
	 * @param options.organizationEntityStorageType The entity storage type of the registered organizations.
	 * @param options.logging The logging component that records a failure, when it exists.
	 * @returns The organizations whose credential could not be issued.
	 */
	public static async complete(
		storage: IEntityStorageConnector<AccountData>,
		identityComponent: IIdentityComponent,
		verificationMethodId: string,
		accountId: string,
		identity?: string,
		options?: { organizationEntityStorageType?: string; logging?: ILoggingComponent }
	): Promise<string[]> {
		const organizations = await OrganizationMembershipHelper.loadOrganizations(storage, accountId);
		const pending = new Set<string>();
		for (const item of organizations) {
			const organization = AuthenticationAccountHelper.getOrganization(item.data);
			if (Is.stringValue(organization)) {
				pending.add(organization);
			}
		}
		if (pending.size === 0) {
			return [];
		}
		// The identity and credentials are read once for every organization.
		const [accountIdentity, credentials] = await Promise.all([
			identity ?? OrganizationMembershipHelper.loadIdentity(storage, accountId),
			OrganizationMembershipHelper.loadCredentials(storage, accountId)
		]);
		const failed: string[] = [];
		for (const organization of pending) {
			try {
				// Joining only issues the credential when it is missing.
				await OrganizationMembershipHelper.join(
					storage,
					identityComponent,
					verificationMethodId,
					accountId,
					organization,
					undefined,
					{ identity: accountIdentity, organizations, credentials },
					options?.organizationEntityStorageType
				);
			} catch (error) {
				failed.push(organization);
				await options?.logging?.log({
					level: "warn",
					source: PendingMembershipHelper.CLASS_NAME,
					ts: Date.now(),
					message: "membershipCredentialFailed",
					error: BaseError.fromError(error),
					data: { accountId, organization }
				});
			}
		}
		return failed;
	}
}
