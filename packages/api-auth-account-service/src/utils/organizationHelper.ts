// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { AuthenticationAccountHelper } from "@3sixty/api-auth-models";
import { ContextIdKeys, ContextIdStore } from "@3sixty/context";
import { Guards, Is, NotFoundError, RandomHelper } from "@3sixty/core";
import { ComparisonOperator } from "@3sixty/entity";
import type { IEntityStorageConnector } from "@3sixty/entity-storage-models";
import { nameof } from "@3sixty/nameof";
import type { AccountData } from "../entities/accountData.js";
import type { Organization } from "../entities/organization.js";

/**
 * Helper class for the organizations registered on the node, shared by the services and the node
 * migration.
 */
export class OrganizationHelper {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<OrganizationHelper>();

	/**
	 * The type of the account data item, owned by the DID of a removed organization, that keeps the
	 * revocation index it reached.
	 */
	public static readonly RETIRED_REVOCATION_INDEX_TYPE: string = "organization-revocation-index";

	/**
	 * The longest search name stored, the length of its column.
	 * @internal
	 */
	private static readonly _SEARCH_NAME_MAX_LENGTH: number = 255;

	/**
	 * Find an organization by its DID.
	 * @param storage The entity storage for the organizations.
	 * @param identity The DID of the organization.
	 * @returns The organization, or undefined when it is not registered.
	 */
	public static async findByIdentity(
		storage: IEntityStorageConnector<Organization>,
		identity: string
	): Promise<Organization | undefined> {
		Guards.stringValue(OrganizationHelper.CLASS_NAME, nameof(identity), identity);
		const result = await storage.query(
			{ property: "identity", value: identity, comparison: ComparisonOperator.Equals },
			undefined,
			undefined,
			undefined,
			1
		);
		return result.entities[0] as Organization | undefined;
	}

	/**
	 * Find an organization by its unique identifier or its DID.
	 * @param storage The entity storage for the organizations.
	 * @param id The unique identifier or the DID of the organization.
	 * @returns The organization, or undefined when it is not registered.
	 */
	public static async find(
		storage: IEntityStorageConnector<Organization>,
		id: string
	): Promise<Organization | undefined> {
		Guards.stringValue(OrganizationHelper.CLASS_NAME, nameof(id), id);
		if (id.startsWith("did:")) {
			return OrganizationHelper.findByIdentity(storage, id);
		}
		const organization = await storage.get(id);
		return Is.object<Organization>(organization) ? organization : undefined;
	}

	/**
	 * Register an organization for a DID, returning the existing one when the DID is registered, so
	 * a repeated call does not add another.
	 * @param storage The entity storage for the organizations.
	 * @param identity The DID of the organization.
	 * @param searchName The search name of a created organization, from searchName, empty when omitted.
	 * @param identityHeld True when the node created or imported the DID, so its keys are removed
	 * with the organization.
	 * @param nextRevocationIndex The revocation index a created organization starts from, zero when
	 * omitted.
	 * @returns The organization and whether it was created.
	 */
	public static async register(
		storage: IEntityStorageConnector<Organization>,
		identity: string,
		searchName?: string,
		identityHeld?: boolean,
		nextRevocationIndex?: number
	): Promise<{ organization: Organization; created: boolean }> {
		const existing = await OrganizationHelper.findByIdentity(storage, identity);
		if (Is.object(existing)) {
			return { organization: existing, created: false };
		}

		const now = new Date().toISOString();
		const organization: Organization = {
			id: RandomHelper.generateUuidV7(),
			identity,
			searchName: searchName ?? "",
			nextRevocationIndex:
				Is.integer(nextRevocationIndex) && nextRevocationIndex > 0
					? nextRevocationIndex
					: undefined,
			identityHeld: identityHeld === true ? true : undefined,
			dateCreated: now,
			dateModified: now
		};
		await storage.set(organization);
		return { organization, created: true };
	}

	/**
	 * Change a registered organization, reading it by id just before the write so the change is made
	 * to the latest stored value. The last write wins.
	 * @param storage The entity storage for the organizations.
	 * @param identity The DID of the organization.
	 * @param change Returns the organization with the change made.
	 * @returns The organization as stored, or undefined when it is not registered.
	 */
	public static async updateOrganization(
		storage: IEntityStorageConnector<Organization>,
		identity: string,
		change: (organization: Organization) => Organization
	): Promise<Organization | undefined> {
		const found = await OrganizationHelper.findByIdentity(storage, identity);
		if (!Is.object(found)) {
			return undefined;
		}
		// Read by id, which unlike the identity index is always up to date.
		const current = await storage.get(found.id);
		if (!Is.object<Organization>(current)) {
			return undefined;
		}
		const updated: Organization = {
			...change({ ...current }),
			id: current.id,
			identity: current.identity,
			dateModified: new Date(Date.now()).toISOString()
		};
		await storage.set(updated);
		return updated;
	}

	/**
	 * Allocate the revocation index of a membership credential an organization issues, from a
	 * counter held with the organization, so every credential it issues has its own index.
	 * @param storage The entity storage for the organizations.
	 * @param identity The DID of the organization.
	 * @returns The index, or undefined when the organization is not registered.
	 */
	public static async allocateRevocationIndex(
		storage: IEntityStorageConnector<Organization>,
		identity: string
	): Promise<number | undefined> {
		let allocated: number | undefined;
		const updated = await OrganizationHelper.updateOrganization(storage, identity, organization => {
			allocated = Is.integer(organization.nextRevocationIndex)
				? organization.nextRevocationIndex
				: 0;
			return { ...organization, nextRevocationIndex: allocated + 1 };
		});
		return Is.object(updated) ? allocated : undefined;
	}

	/**
	 * Get the unique identifier of the account data item that keeps the revocation index an
	 * organization reached once it is removed, the same for every registration of its DID.
	 * @param identity The DID of the organization.
	 * @returns The unique identifier of the item.
	 */
	public static retiredRevocationIndexId(identity: string): string {
		return `organization-revocation-${AuthenticationAccountHelper.identityItemId(identity)}`;
	}

	/**
	 * Get the revocation index an organization reached when its DID was last removed, so registering
	 * the DID again never gives a credential an index the DID has already used.
	 * @param accountDataStorage The entity storage for account data.
	 * @param identity The DID of the organization.
	 * @returns The index, or undefined when the DID was never removed with credentials issued.
	 */
	public static async getRetiredRevocationIndex(
		accountDataStorage: IEntityStorageConnector<AccountData>,
		identity: string
	): Promise<number | undefined> {
		const item = await accountDataStorage.get(
			OrganizationHelper.retiredRevocationIndexId(identity)
		);
		const data = Is.object<AccountData>(item) ? item.data : undefined;
		return Is.object<{ nextRevocationIndex?: unknown }>(data) &&
			Is.integer(data.nextRevocationIndex)
			? data.nextRevocationIndex
			: undefined;
	}

	/**
	 * Keep the revocation index an organization reached, when it is removed, unless a higher index
	 * is already kept.
	 * @param accountDataStorage The entity storage for account data.
	 * @param identity The DID of the organization.
	 * @param nextRevocationIndex The revocation index the next credential would have been given.
	 * @returns A promise that resolves when the index is kept.
	 */
	public static async retireRevocationIndex(
		accountDataStorage: IEntityStorageConnector<AccountData>,
		identity: string,
		nextRevocationIndex: number | undefined
	): Promise<void> {
		if (!Is.integer(nextRevocationIndex) || nextRevocationIndex <= 0) {
			return;
		}
		const kept = await OrganizationHelper.getRetiredRevocationIndex(accountDataStorage, identity);
		if (Is.integer(kept) && kept >= nextRevocationIndex) {
			return;
		}
		const now = new Date().toISOString();
		await accountDataStorage.set({
			id: OrganizationHelper.retiredRevocationIndexId(identity),
			accountId: identity,
			type: OrganizationHelper.RETIRED_REVOCATION_INDEX_TYPE,
			data: { nextRevocationIndex },
			isDefault: false,
			dateCreated: now,
			dateModified: now
		});
	}

	/**
	 * Get the search name of a public profile, its name in lower case.
	 * @param publicProfile The public profile.
	 * @returns The search name, empty when the profile has no name.
	 */
	public static searchName(publicProfile: unknown): string {
		const name = Is.object<{ name?: unknown }>(publicProfile) ? publicProfile.name : undefined;
		return Is.string(name)
			? name.trim().toLowerCase().slice(0, OrganizationHelper._SEARCH_NAME_MAX_LENGTH)
			: "";
	}

	/**
	 * Store the search name of an organization from its public profile, when it has changed.
	 * @param storage The entity storage for the organizations.
	 * @param organization The organization.
	 * @param publicProfile The public profile.
	 * @returns The organization as stored.
	 */
	public static async storeSearchName(
		storage: IEntityStorageConnector<Organization>,
		organization: Organization,
		publicProfile: unknown
	): Promise<Organization> {
		const searchName = OrganizationHelper.searchName(publicProfile);
		if (searchName === organization.searchName) {
			return organization;
		}
		const updated = await OrganizationHelper.updateOrganization(
			storage,
			organization.identity,
			current => ({ ...current, searchName })
		);
		return updated ?? organization;
	}

	/**
	 * Ensure an organization DID is registered, so accounts can only join registered organizations.
	 * The organization of the tenant, or of the node when single tenant, is always accepted.
	 * @param storage The entity storage for the organizations.
	 * @param identity The DID of the organization.
	 * @returns A promise that resolves when the organization is registered.
	 * @throws NotFoundError when the organization is not registered.
	 */
	public static async guardRegistered(
		storage: IEntityStorageConnector<Organization>,
		identity: string
	): Promise<void> {
		const contextIds = await ContextIdStore.getContextIds();
		if (
			contextIds?.[ContextIdKeys.Organization] !== identity &&
			!Is.object(await OrganizationHelper.findByIdentity(storage, identity))
		) {
			throw new NotFoundError(OrganizationHelper.CLASS_NAME, "organizationNotRegistered", identity);
		}
	}
}
