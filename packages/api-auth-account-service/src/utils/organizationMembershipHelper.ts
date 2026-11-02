// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import {
	AuthenticationAccountDataType,
	AuthenticationAccountHelper,
	type IAuthenticationAccountData,
	OrganizationCredentialType
} from "@3sixty/api-auth-models";
import { ContextIdKeys, ContextIdStore } from "@3sixty/context";
import { Guards, Is, UnprocessableError } from "@3sixty/core";
import type { IEntityStorageConnector } from "@3sixty/entity-storage-models";
import { DocumentHelper, type IIdentityComponent } from "@3sixty/identity-models";
import { nameof } from "@3sixty/nameof";
import { SchemaOrgContexts } from "@3sixty/standards-schema-org";
import type { IDidVerifiableCredential } from "@3sixty/standards-w3c-did";
import { AccountDataHelper } from "./accountDataHelper.js";
import { OrganizationHelper } from "./organizationHelper.js";
import type { AccountData } from "../entities/accountData.js";
import type { Organization } from "../entities/organization.js";

/**
 * Helper class for adding an account to an organization, used when a request is accepted and when
 * an account is added directly, such as by the node CLI.
 */
export class OrganizationMembershipHelper {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<OrganizationMembershipHelper>();

	/**
	 * The type a membership credential carries after VerifiableCredential, so a holder can tell what
	 * it is for. Credentials issued before it existed carry only VerifiableCredential, so a membership
	 * is still recognised by its issuer and memberOf, never by this type.
	 */
	public static readonly CREDENTIAL_TYPE: string = OrganizationCredentialType.Membership;

	/**
	 * Add an account to an organization, issuing a membership credential signed by the organization
	 * and storing the organization and the JSON credential, with its proof, as account data. Each is
	 * only written when missing, so a repeated call completes an interrupted one, and an existing organization is
	 * otherwise left as it is, other than being made the default when asked. The credential of a
	 * registered organization is given a revocation index from the counter of the organization, which
	 * is recorded with the organization item so the credential is revoked when the membership ends.
	 * @param accountDataStorage The entity storage for account data.
	 * @param organizationStorage The entity storage for the registered organizations, which hold
	 * the revocation index counters.
	 * @param identityComponent The identity component that issues the credential.
	 * @param verificationMethodId The verification method of the organization that signs the credential.
	 * @param accountId The account to add.
	 * @param organization The DID of the organization.
	 * @param isDefault True to make it the default organization of the account, otherwise it is the
	 * default only when it is the first.
	 * @param preloaded The account data the caller has already read, read here when omitted.
	 * @param preloaded.identity The DID of the account.
	 * @param preloaded.organizations The organization items of the account.
	 * @param preloaded.credentials The credentials of the account.
	 * @returns The unique identifier of the organization item.
	 * @throws UnprocessableError when the account has no identity to issue the credential to.
	 */
	public static async join(
		accountDataStorage: IEntityStorageConnector<AccountData>,
		organizationStorage: IEntityStorageConnector<Organization>,
		identityComponent: IIdentityComponent,
		verificationMethodId: string,
		accountId: string,
		organization: string,
		isDefault?: boolean,
		preloaded?: {
			identity?: string;
			organizations?: IAuthenticationAccountData[];
			credentials?: IDidVerifiableCredential[];
		}
	): Promise<string> {
		Guards.stringValue(OrganizationMembershipHelper.CLASS_NAME, nameof(accountId), accountId);
		Guards.stringValue(OrganizationMembershipHelper.CLASS_NAME, nameof(organization), organization);

		const [identity, organizations, credentials] = await Promise.all([
			preloaded?.identity ??
				OrganizationMembershipHelper.loadIdentity(accountDataStorage, accountId),
			preloaded?.organizations ??
				OrganizationMembershipHelper.loadOrganizations(accountDataStorage, accountId),
			preloaded?.credentials ??
				OrganizationMembershipHelper.loadCredentials(accountDataStorage, accountId)
		]);

		const existing = organizations.find(
			item => AuthenticationAccountHelper.getOrganization(item.data) === organization
		);
		if (Is.object(existing) && isDefault === true && !existing.isDefault) {
			await AccountDataHelper.updateItem(accountDataStorage, existing, existing.data, true);
		}

		let issued: IDidVerifiableCredential | undefined;
		let revocationIndex: number | undefined;
		if (
			!Is.stringValue(identity) ||
			!(await OrganizationMembershipHelper.hasMembership(
				identityComponent,
				credentials,
				organization,
				identity
			))
		) {
			if (!Is.stringValue(identity)) {
				throw new UnprocessableError(OrganizationMembershipHelper.CLASS_NAME, "identityRequired", {
					accountId
				});
			}

			// An organization that is not registered, such as the organization of the tenant when the
			// node has not registered it, has no counter, so its credentials have no revocation index.
			revocationIndex = await OrganizationHelper.allocateRevocationIndex(
				organizationStorage,
				organization
			);
			const credential = await identityComponent.verifiableCredentialCreate(
				DocumentHelper.joinId(organization, verificationMethodId),
				undefined,
				{
					"@context": SchemaOrgContexts.Context,
					"@type": "Person",
					id: identity,
					memberOf: { "@type": "Organization", id: organization }
				},
				{
					revocationIndex: Is.integer(revocationIndex) ? revocationIndex : undefined,
					types: [OrganizationMembershipHelper.CREDENTIAL_TYPE]
				},
				organization
			);
			issued = credential.verifiableCredential;
		}

		let id: string;
		if (Is.object(existing)) {
			id = existing.id;
			if (Is.integer(revocationIndex)) {
				const previous = await AccountDataHelper.getRevocationIndex(accountDataStorage, id);
				await AccountDataHelper.setRevocationIndex(accountDataStorage, id, revocationIndex);
				// A credential issued before for the item no longer counts, so it is revoked.
				if (Is.integer(previous) && previous !== revocationIndex) {
					await OrganizationMembershipHelper.revokeIndex(identityComponent, organization, previous);
				}
			}
		} else {
			id = await AccountDataHelper.create(
				accountDataStorage,
				accountId,
				AuthenticationAccountDataType.Organization,
				AuthenticationAccountHelper.createOrganizationData(organization),
				isDefault ?? organizations.length === 0,
				undefined,
				{ revocationIndex }
			);
		}
		if (Is.object(issued)) {
			await AccountDataHelper.create(
				accountDataStorage,
				accountId,
				AuthenticationAccountDataType.VerifiableCredential,
				issued
			);
		}
		return id;
	}

	/**
	 * Check whether an account holds a valid membership credential for an organization. Each stored
	 * credential that claims to be issued by the organization is verified, it must be signed by and
	 * issued by the organization, not revoked, and name the identity of the account as a member,
	 * others are ignored.
	 * @param accountDataStorage The entity storage for account data.
	 * @param identityComponent The identity component that verifies the credentials.
	 * @param accountId The account id.
	 * @param organization The DID of the organization.
	 * @param preloaded The account data the caller has already read, read here when omitted.
	 * @param preloaded.identity The DID of the account.
	 * @param preloaded.credentials The credentials of the account.
	 * @returns True when the account holds a valid membership credential for the organization.
	 */
	public static async hasCredential(
		accountDataStorage: IEntityStorageConnector<AccountData>,
		identityComponent: IIdentityComponent,
		accountId: string,
		organization: string,
		preloaded?: { identity?: string; credentials?: IDidVerifiableCredential[] }
	): Promise<boolean> {
		Guards.stringValue(OrganizationMembershipHelper.CLASS_NAME, nameof(accountId), accountId);
		Guards.stringValue(OrganizationMembershipHelper.CLASS_NAME, nameof(organization), organization);

		const identity =
			preloaded?.identity ??
			(await OrganizationMembershipHelper.loadIdentity(accountDataStorage, accountId));
		if (!Is.stringValue(identity)) {
			return false;
		}
		const credentials =
			preloaded?.credentials ??
			(await OrganizationMembershipHelper.loadCredentials(accountDataStorage, accountId));
		return OrganizationMembershipHelper.hasMembership(
			identityComponent,
			credentials,
			organization,
			identity
		);
	}

	/**
	 * Read the DID of an account.
	 * @param accountDataStorage The entity storage for account data.
	 * @param accountId The account id.
	 * @returns The DID, or undefined when the account has none.
	 */
	public static async loadIdentity(
		accountDataStorage: IEntityStorageConnector<AccountData>,
		accountId: string
	): Promise<string | undefined> {
		const identity = await AccountDataHelper.getDefault(
			accountDataStorage,
			accountId,
			AuthenticationAccountDataType.Identity
		);
		return AuthenticationAccountHelper.getIdentity(identity?.data);
	}

	/**
	 * Read every organization item of an account.
	 * @param accountDataStorage The entity storage for account data.
	 * @param accountId The account id.
	 * @returns The organization items.
	 */
	public static async loadOrganizations(
		accountDataStorage: IEntityStorageConnector<AccountData>,
		accountId: string
	): Promise<IAuthenticationAccountData[]> {
		const organizations: IAuthenticationAccountData[] = [];
		let cursor: string | undefined;
		do {
			const page = await AccountDataHelper.query(
				accountDataStorage,
				accountId,
				AuthenticationAccountDataType.Organization,
				cursor
			);
			organizations.push(...page.entities);
			cursor = page.cursor;
		} while (Is.stringValue(cursor));
		return organizations;
	}

	/**
	 * Revoke a membership credential by the revocation index the node recorded when it issued it,
	 * signing for the organization as the node.
	 * @param identityComponent The identity component.
	 * @param organization The DID of the organization.
	 * @param revocationIndex The recorded index.
	 * @param nodeIdentity The DID of the node, read from the context when omitted.
	 * @returns True when the credential was revoked.
	 */
	public static async revokeIndex(
		identityComponent: IIdentityComponent,
		organization: string,
		revocationIndex: number,
		nodeIdentity?: string
	): Promise<boolean> {
		const controller = nodeIdentity ?? (await ContextIdStore.getContextIds())?.[ContextIdKeys.Node];
		if (!Is.stringValue(controller)) {
			return false;
		}
		try {
			await identityComponent.verifiableCredentialRevoke(organization, revocationIndex, controller);
			return true;
		} catch {
			// The node may no longer hold the keys of the organization, so ending a membership does not
			// depend on revocation.
			return false;
		}
	}

	/**
	 * Read the JSON credentials of an account, values that are not JSON credentials are ignored.
	 * @param accountDataStorage The entity storage for account data.
	 * @param accountId The account id.
	 * @returns The credentials.
	 */
	public static async loadCredentials(
		accountDataStorage: IEntityStorageConnector<AccountData>,
		accountId: string
	): Promise<IDidVerifiableCredential[]> {
		const credentials: IDidVerifiableCredential[] = [];
		let cursor: string | undefined;
		do {
			const page = await AccountDataHelper.query(
				accountDataStorage,
				accountId,
				AuthenticationAccountDataType.VerifiableCredential,
				cursor
			);
			for (const item of page.entities) {
				const credential = AuthenticationAccountHelper.getCredential(item.data);
				if (Is.object(credential)) {
					credentials.push(credential);
				}
			}
			cursor = page.cursor;
		} while (Is.stringValue(cursor));
		return credentials;
	}

	/**
	 * Check whether a credential claims to be issued by an organization, without verifying it, so
	 * only credentials that could count are verified.
	 * @param credential The credential.
	 * @param organization The DID of the organization.
	 * @returns True when the unverified issuer is the organization.
	 */
	public static claimsIssuer(credential: IDidVerifiableCredential, organization: string): boolean {
		return AuthenticationAccountHelper.getCredentialIssuer(credential) === organization;
	}

	/**
	 * Check whether a credential verifies and shows the identity is a member of an organization.
	 * @param identityComponent The identity component that verifies the credential.
	 * @param credential The credential.
	 * @param organization The DID of the organization.
	 * @param identity The DID of the account.
	 * @returns True when the credential is valid membership of the organization for the identity.
	 */
	public static async isValidMembership(
		identityComponent: IIdentityComponent,
		credential: IDidVerifiableCredential,
		organization: string,
		identity: string
	): Promise<boolean> {
		let result: Awaited<ReturnType<IIdentityComponent["verifiableCredentialVerify"]>>;
		try {
			result = await identityComponent.verifiableCredentialVerify(credential);
		} catch {
			// A credential that does not verify is treated as missing, so a valid one is issued.
			return false;
		}
		const vc = result.verifiableCredential;
		if (result.revoked || !Is.object(vc)) {
			return false;
		}

		if (AuthenticationAccountHelper.getCredentialIssuer(vc) !== organization) {
			return false;
		}

		return AuthenticationAccountHelper.getCredentialSubjects(vc).some(subject => {
			if (subject.id !== identity) {
				return false;
			}
			const memberOf = Is.array(subject.memberOf) ? subject.memberOf : [subject.memberOf];
			return memberOf.some(
				member => Is.object<{ id?: unknown }>(member) && member.id === organization
			);
		});
	}

	/**
	 * Check whether any credential is a valid membership of an organization for an identity. Only the
	 * credentials that claim the organization as their issuer are verified, every credential that
	 * counts is fully verified.
	 * @param identityComponent The identity component that verifies the credentials.
	 * @param credentials The credentials.
	 * @param organization The DID of the organization.
	 * @param identity The DID of the account.
	 * @returns True when a credential is valid membership.
	 * @internal
	 */
	private static async hasMembership(
		identityComponent: IIdentityComponent,
		credentials: IDidVerifiableCredential[],
		organization: string,
		identity: string
	): Promise<boolean> {
		for (const credential of credentials) {
			if (
				OrganizationMembershipHelper.claimsIssuer(credential, organization) &&
				(await OrganizationMembershipHelper.isValidMembership(
					identityComponent,
					credential,
					organization,
					identity
				))
			) {
				return true;
			}
		}
		return false;
	}
}
