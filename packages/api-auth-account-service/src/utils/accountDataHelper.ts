// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import {
	AuthenticationAccountDataType,
	AuthenticationAccountHelper,
	type IAuthenticationAccountData
} from "@3sixty/api-auth-models";
import { ContextIdKeys, ContextIdStore } from "@3sixty/context";
import {
	ConflictError,
	Guards,
	Is,
	NotFoundError,
	RandomHelper,
	StringHelper,
	UnprocessableError,
	Urn
} from "@3sixty/core";
import { ComparisonOperator, LogicalOperator, SortDirection } from "@3sixty/entity";
import type { IEntityStorageConnector } from "@3sixty/entity-storage-models";
import { nameof } from "@3sixty/nameof";
import { AccountContextCache } from "./accountContextCache.js";
import { OrganizationHelper } from "./organizationHelper.js";
import type { AccountData } from "../entities/accountData.js";

/**
 * Helper class for storing account data, shared by the account and admin services.
 */
export class AccountDataHelper {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<AccountDataHelper>();

	/**
	 * The type of the records the node migration keeps until its pending work is done.
	 */
	public static readonly MIGRATION_TYPE: string = "migration";

	/**
	 * The content type of an avatar the account uploads.
	 */
	public static readonly AVATAR_CONTENT_TYPE: string = "image/jpeg";

	/**
	 * The largest avatar the account uploads, in decoded bytes.
	 */
	public static readonly AVATAR_MAX_BYTES: number = 262144;

	/**
	 * The content types of an avatar owned by an authentication provider.
	 */
	public static readonly PROVIDER_AVATAR_CONTENT_TYPES: string[] = [
		"image/jpeg",
		"image/png",
		"image/webp"
	];

	/**
	 * The largest avatar owned by an authentication provider, in decoded bytes.
	 */
	public static readonly PROVIDER_AVATAR_MAX_BYTES: number = 1048576;

	/**
	 * The largest width and height of an avatar, in pixels.
	 */
	public static readonly AVATAR_MAX_DIMENSION: number = 1024;

	/**
	 * The types the request context is resolved from, a change clears the cached account.
	 * @internal
	 */
	private static readonly _CONTEXT_TYPES: string[] = [
		AuthenticationAccountDataType.Identity,
		AuthenticationAccountDataType.Organization
	];

	/**
	 * The number of items read at a time when looking for the item of a type to use first.
	 * @internal
	 */
	private static readonly _FIND_PAGE_SIZE: number = 10;

	/**
	 * Normalise a type, types are stored in kebab case, so every storage matches a type the same way
	 * whether or not it compares without case, and publicProfile, PublicProfile and public_profile
	 * are all public-profile.
	 * @param type The type.
	 * @returns The normalised type.
	 * @throws GuardError when the type is empty.
	 */
	public static normaliseType(type: string): string {
		Guards.stringValue(AccountDataHelper.CLASS_NAME, nameof(type), type);
		const normalised = StringHelper.kebabCase(type, false);
		Guards.stringValue(AccountDataHelper.CLASS_NAME, nameof(type), normalised);
		return normalised;
	}

	/**
	 * Check the value of an item, a JSON object, in the fixed shape of its type for the common types.
	 * An identity is a JSON-LD node with the DID context and the DID as its id, an organization a
	 * schema.org Organization with the DID as its identifier, a verifiable credential a JSON
	 * credential object with a proof, and an avatar a
	 * schema.org ImageObject holding a base64 data URL. An avatar marked read only is owned by an
	 * authentication provider, so it may be in any of the provider content types and up to the larger
	 * size.
	 * @param type The type of the item.
	 * @param data The value of the item.
	 * @param accountOwned True when the account sets the value itself, so it may not mark it read only.
	 * @throws UnprocessableError when the value is not valid for the type.
	 */
	public static validateData(type: string, data: unknown, accountOwned?: boolean): void {
		if (AccountDataHelper.isType(type, AuthenticationAccountDataType.Identity)) {
			if (!AccountDataHelper.isDid(AuthenticationAccountHelper.getIdentity(data))) {
				throw new UnprocessableError(AccountDataHelper.CLASS_NAME, "identityDataInvalid");
			}
			return;
		}
		if (AccountDataHelper.isType(type, AuthenticationAccountDataType.Organization)) {
			if (!AccountDataHelper.isDid(AuthenticationAccountHelper.getOrganization(data))) {
				throw new UnprocessableError(AccountDataHelper.CLASS_NAME, "organizationDataInvalid");
			}
			return;
		}
		if (AccountDataHelper.isType(type, AuthenticationAccountDataType.VerifiableCredential)) {
			if (!AccountDataHelper.isCredential(data)) {
				throw new UnprocessableError(AccountDataHelper.CLASS_NAME, "credentialDataInvalid");
			}
			return;
		}
		if (!AccountDataHelper.isType(type, AuthenticationAccountDataType.Avatar)) {
			if (!Is.object(data)) {
				throw new UnprocessableError(AccountDataHelper.CLASS_NAME, "accountDataNotObject", {
					type
				});
			}
			return;
		}
		const avatar = Is.object<{ [key: string]: unknown }>(data) ? data : undefined;
		const providerOwned = accountOwned !== true && AuthenticationAccountHelper.isReadOnly(data);
		const contentTypes = providerOwned
			? AccountDataHelper.PROVIDER_AVATAR_CONTENT_TYPES
			: [AccountDataHelper.AVATAR_CONTENT_TYPE];
		const encodingFormat = avatar?.encodingFormat;
		const contentUrl = avatar?.contentUrl;
		const prefix = `data:${Is.string(encodingFormat) ? encodingFormat : ""};base64,`;
		const payload =
			Is.string(contentUrl) && contentUrl.startsWith(prefix)
				? contentUrl.slice(prefix.length)
				: undefined;
		if (
			Is.undefined(avatar) ||
			(accountOwned === true && AuthenticationAccountHelper.isReadOnly(data)) ||
			avatar["@type"] !== "ImageObject" ||
			!Is.string(encodingFormat) ||
			!contentTypes.includes(encodingFormat) ||
			!Is.stringBase64(payload) ||
			!AccountDataHelper.isDimension(avatar.width) ||
			!AccountDataHelper.isDimension(avatar.height)
		) {
			throw new UnprocessableError(AccountDataHelper.CLASS_NAME, "avatarInvalid");
		}

		const maxBytes = providerOwned
			? AccountDataHelper.PROVIDER_AVATAR_MAX_BYTES
			: AccountDataHelper.AVATAR_MAX_BYTES;
		// Base64 holds 3 bytes in every 4 characters, less the padding.
		const encodedBytes = (payload.length / 4) * 3;
		const padding = payload.length - payload.replace(/=+$/, "").length;
		if (encodedBytes - padding > maxBytes) {
			throw new UnprocessableError(AccountDataHelper.CLASS_NAME, "avatarTooLarge", { maxBytes });
		}
	}

	/**
	 * Check whether a type is one of a list of types once normalised, so a variant of a reserved
	 * type is treated as reserved.
	 * @param type The type.
	 * @param types The types to match, in their normalised form.
	 * @returns True when the type matches one of the types.
	 */
	public static isType(type: string, ...types: string[]): boolean {
		return types.includes(StringHelper.kebabCase(type, false));
	}

	/**
	 * Ensure a DID may be bound to an account, it must not be the node, the organization of the
	 * tenant or node, a registered organization, or held by an account.
	 * @param storage The entity storage for account data.
	 * @param organizationStorageType The entity storage type of the registered organizations.
	 * @param identity The DID.
	 * @returns A promise that resolves when the DID is available.
	 * @throws ConflictError when the DID is held.
	 */
	public static async guardIdentityAvailable(
		storage: IEntityStorageConnector<AccountData>,
		organizationStorageType: string,
		identity: string
	): Promise<void> {
		Guards.stringValue(AccountDataHelper.CLASS_NAME, nameof(identity), identity);
		const contextIds = await ContextIdStore.getContextIds();
		if (
			contextIds?.[ContextIdKeys.Node] === identity ||
			contextIds?.[ContextIdKeys.Organization] === identity ||
			Is.object(await OrganizationHelper.findRegistered(organizationStorageType, identity))
		) {
			throw new ConflictError(AccountDataHelper.CLASS_NAME, "identityHeldByNode", identity);
		}
		const id = AccountDataHelper.identityId(identity);
		if (Is.object(await storage.get(id))) {
			throw new ConflictError(AccountDataHelper.CLASS_NAME, "identityInUse", id);
		}
	}

	/**
	 * Store an item for an account.
	 * @param storage The entity storage for account data.
	 * @param accountId The account to store the item for.
	 * @param type The type of the item, stored normalised.
	 * @param data The value of the item.
	 * @param isDefault True to use the item first for its type, clearing any other default.
	 * @param id The unique identifier to use, a new one is generated when omitted.
	 * @param options Checks the caller has already made.
	 * @param options.hasNoItems True when the account is known to hold no item of the type, so there
	 * is no default to clear.
	 * @param options.revocationIndex The revocation index of the membership credential the node
	 * issued for an organization item.
	 * @returns The unique identifier of the item.
	 */
	public static async create(
		storage: IEntityStorageConnector<AccountData>,
		accountId: string,
		type: string,
		data: unknown,
		isDefault?: boolean,
		id?: string,
		options?: { hasNoItems?: boolean; revocationIndex?: number }
	): Promise<string> {
		Guards.stringValue(AccountDataHelper.CLASS_NAME, nameof(accountId), accountId);
		type = AccountDataHelper.normaliseType(type);
		Guards.defined(AccountDataHelper.CLASS_NAME, nameof(data), data);
		AccountDataHelper.validateData(type, data);

		if (isDefault === true && options?.hasNoItems !== true) {
			await AccountDataHelper.clearDefault(storage, accountId, type);
		}

		const now = new Date().toISOString();
		const item: AccountData = {
			id: id ?? RandomHelper.generateUuidV7(),
			accountId,
			type,
			data,
			organization: AccountDataHelper.organizationOf(type, data),
			revocationIndex:
				type === AuthenticationAccountDataType.Organization ? options?.revocationIndex : undefined,
			isDefault: isDefault ?? false,
			dateCreated: now,
			dateModified: now
		};
		await storage.set(item);
		await AccountDataHelper.invalidate(accountId, type);
		return item.id;
	}

	/**
	 * Get the unique identifier of the identity item for a DID, the same for every account so a DID
	 * can only be held by one account.
	 * @param identity The DID.
	 * @returns The unique identifier of the item.
	 */
	public static identityId(identity: string): string {
		// Derived from the DID, so the in-use check and a repeated migration write are a single get or
		// set by id.
		return AuthenticationAccountHelper.identityItemId(identity);
	}

	/**
	 * Get the key of the lock that serialises binding an identity to an account.
	 * @param accountId The account id.
	 * @returns The lock key.
	 */
	public static identityLockKey(accountId: string): string {
		return `account-identity-${accountId}`;
	}

	/**
	 * Get the key of the lock that serialises binding a DID, so two accounts can not bind it at once.
	 * Always taken after the lock of the account.
	 * @param identity The DID.
	 * @returns The lock key.
	 */
	public static didLockKey(identity: string): string {
		return `account-identity-did-${AccountDataHelper.identityId(identity)}`;
	}

	/**
	 * Count the items of an account, optionally of a type. Storage may compare without case, so the
	 * count can only be higher than the exact count.
	 * @param storage The entity storage for account data.
	 * @param accountId The account id.
	 * @param type The type of the items, all types when omitted.
	 * @returns The number of items.
	 */
	public static async count(
		storage: IEntityStorageConnector<AccountData>,
		accountId: string,
		type?: string
	): Promise<number> {
		Guards.stringValue(AccountDataHelper.CLASS_NAME, nameof(accountId), accountId);
		const conditions: {
			property: string;
			value: string;
			comparison: (typeof ComparisonOperator)[keyof typeof ComparisonOperator];
		}[] = [{ property: "accountId", value: accountId, comparison: ComparisonOperator.Equals }];
		if (Is.stringValue(type)) {
			conditions.push({
				property: "type",
				value: AccountDataHelper.normaliseType(type),
				comparison: ComparisonOperator.Equals
			});
		}
		return storage.count({ conditions, logicalOperator: LogicalOperator.And });
	}

	/**
	 * Get the revocation index the node recorded for the membership credential of an organization item.
	 * @param storage The entity storage for account data.
	 * @param id The unique identifier of the organization item.
	 * @returns The index, or undefined when none was recorded.
	 */
	public static async getRevocationIndex(
		storage: IEntityStorageConnector<AccountData>,
		id: string
	): Promise<number | undefined> {
		const item = await storage.get(id);
		return Is.object<AccountData>(item) &&
			item.type === AuthenticationAccountDataType.Organization &&
			Is.integer(item.revocationIndex)
			? item.revocationIndex
			: undefined;
	}

	/**
	 * Record the revocation index of the membership credential the node issued for an organization item.
	 * @param storage The entity storage for account data.
	 * @param id The unique identifier of the organization item.
	 * @param revocationIndex The index.
	 * @returns A promise that resolves when the index has been recorded.
	 * @throws NotFoundError when the item does not exist.
	 */
	public static async setRevocationIndex(
		storage: IEntityStorageConnector<AccountData>,
		id: string,
		revocationIndex: number
	): Promise<void> {
		const item = await storage.get(id);
		if (!Is.object<AccountData>(item)) {
			throw new NotFoundError(AccountDataHelper.CLASS_NAME, "accountDataNotFound", id);
		}
		await storage.set({ ...item, revocationIndex, dateModified: new Date().toISOString() });
	}

	/**
	 * Store the identity of an account, an account has only one and a DID is held by only one account.
	 * @param storage The entity storage for account data.
	 * @param accountId The account to store the identity for.
	 * @param identity The DID.
	 * @param options Checks the caller has already made, so they are not repeated.
	 * @param options.accountChecked True when the account was found to have no identity while
	 * holding its identity lock.
	 * @param options.availabilityChecked True when the DID was found not to be held by an account, or
	 * was just created.
	 * @returns The unique identifier of the item.
	 * @throws ConflictError when the account already has an identity or the DID is held by an account.
	 */
	public static async createIdentity(
		storage: IEntityStorageConnector<AccountData>,
		accountId: string,
		identity: string,
		options?: { accountChecked?: boolean; availabilityChecked?: boolean }
	): Promise<string> {
		Guards.stringValue(AccountDataHelper.CLASS_NAME, nameof(accountId), accountId);

		const id = AccountDataHelper.identityId(identity);
		if (options?.accountChecked !== true) {
			await AccountDataHelper.guardNoIdentity(storage, accountId);
		}
		if (options?.availabilityChecked !== true && Is.object(await storage.get(id))) {
			throw new ConflictError(AccountDataHelper.CLASS_NAME, "identityInUse", id);
		}

		// The account has no identity, so there is no default identity to clear.
		return AccountDataHelper.create(
			storage,
			accountId,
			AuthenticationAccountDataType.Identity,
			AuthenticationAccountHelper.createIdentityData(identity),
			true,
			id,
			{ hasNoItems: true }
		);
	}

	/**
	 * Ensure an account has no identity yet.
	 * @param storage The entity storage for account data.
	 * @param accountId The account id.
	 * @returns A promise that resolves when the account has no identity.
	 * @throws ConflictError when the account already has an identity.
	 */
	public static async guardNoIdentity(
		storage: IEntityStorageConnector<AccountData>,
		accountId: string
	): Promise<void> {
		const existing = await AccountDataHelper.getDefault(
			storage,
			accountId,
			AuthenticationAccountDataType.Identity
		);
		if (Is.object(existing)) {
			throw new ConflictError(AccountDataHelper.CLASS_NAME, "identityAlreadyAssigned", existing.id);
		}
	}

	/**
	 * Get an item, optionally only when it belongs to an account.
	 * @param storage The entity storage for account data.
	 * @param id The unique identifier of the item.
	 * @param accountId The account the item must belong to, any account when omitted.
	 * @returns The item.
	 * @throws NotFoundError when the item does not exist or belongs to another account.
	 */
	public static async get(
		storage: IEntityStorageConnector<AccountData>,
		id: string,
		accountId?: string
	): Promise<IAuthenticationAccountData> {
		Guards.stringValue(AccountDataHelper.CLASS_NAME, nameof(id), id);

		const item = await storage.get(id);
		// An item of another account is reported as missing, so its existence is not revealed.
		if (
			!Is.object<AccountData>(item) ||
			(Is.stringValue(accountId) && item.accountId !== accountId)
		) {
			throw new NotFoundError(AccountDataHelper.CLASS_NAME, "accountDataNotFound", id);
		}
		return AccountDataHelper.toData(item);
	}

	/**
	 * Replace the value of an item, optionally only when it belongs to an account.
	 * @param storage The entity storage for account data.
	 * @param id The unique identifier of the item.
	 * @param data The new value of the item.
	 * @param isDefault True to use the item first for its type, clearing any other default, unchanged when omitted.
	 * @param accountId The account the item must belong to, any account when omitted.
	 * @returns A promise that resolves when the item has been updated.
	 * @throws NotFoundError when the item does not exist or belongs to another account.
	 */
	public static async update(
		storage: IEntityStorageConnector<AccountData>,
		id: string,
		data: unknown,
		isDefault?: boolean,
		accountId?: string
	): Promise<void> {
		Guards.defined(AccountDataHelper.CLASS_NAME, nameof(data), data);
		const item = await AccountDataHelper.get(storage, id, accountId);
		await AccountDataHelper.updateItem(storage, item, data, isDefault);
	}

	/**
	 * Replace the value of an item the caller has already read and checked the owner of.
	 * @param storage The entity storage for account data.
	 * @param item The item as read.
	 * @param data The new value of the item.
	 * @param isDefault True to use the item first for its type, clearing any other default, unchanged when omitted.
	 * @returns A promise that resolves when the item has been updated.
	 */
	public static async updateItem(
		storage: IEntityStorageConnector<AccountData>,
		item: IAuthenticationAccountData,
		data: unknown,
		isDefault?: boolean
	): Promise<void> {
		Guards.defined(AccountDataHelper.CLASS_NAME, nameof(data), data);
		AccountDataHelper.validateData(item.type, data);
		if (isDefault === true && !item.isDefault) {
			await AccountDataHelper.clearDefault(storage, item.accountId, item.type);
		}
		// The revocation index is not returned with an item, so it is read to be kept.
		const revocationIndex =
			item.type === AuthenticationAccountDataType.Organization
				? await AccountDataHelper.getRevocationIndex(storage, item.id)
				: undefined;
		await storage.set({
			id: item.id,
			accountId: item.accountId,
			type: item.type,
			data,
			organization: AccountDataHelper.organizationOf(item.type, data),
			revocationIndex,
			isDefault: isDefault ?? item.isDefault,
			dateCreated: item.dateCreated,
			dateModified: new Date().toISOString()
		});
		await AccountDataHelper.invalidate(item.accountId, item.type);
	}

	/**
	 * Remove an item, optionally only when it belongs to an account.
	 * @param storage The entity storage for account data.
	 * @param id The unique identifier of the item.
	 * @param accountId The account the item must belong to, any account when omitted.
	 * @returns A promise that resolves when the item has been removed.
	 * @throws NotFoundError when the item does not exist or belongs to another account.
	 */
	public static async remove(
		storage: IEntityStorageConnector<AccountData>,
		id: string,
		accountId?: string
	): Promise<void> {
		const item = await AccountDataHelper.get(storage, id, accountId);
		await AccountDataHelper.removeItem(storage, item);
	}

	/**
	 * Remove an item the caller has already read and checked the owner of.
	 * @param storage The entity storage for account data.
	 * @param item The item as read.
	 * @returns A promise that resolves when the item has been removed.
	 */
	public static async removeItem(
		storage: IEntityStorageConnector<AccountData>,
		item: IAuthenticationAccountData
	): Promise<void> {
		await storage.remove(item.id);
		await AccountDataHelper.invalidate(item.accountId, item.type);
	}

	/**
	 * Query items, filtered by account and type.
	 * @param storage The entity storage for account data.
	 * @param accountId The account of the items to return, all accounts when omitted.
	 * @param type The type of the items to return, all types when omitted.
	 * @param cursor The cursor to request the next page.
	 * @param limit The maximum number of items to return.
	 * @param excludeTypes The types to leave out when no type is given.
	 * @returns The items and a cursor when there are more.
	 */
	public static async query(
		storage: IEntityStorageConnector<AccountData>,
		accountId?: string,
		type?: string,
		cursor?: string,
		limit?: number,
		excludeTypes?: string[]
	): Promise<{
		entities: IAuthenticationAccountData[];
		cursor?: string;
	}> {
		const conditions: {
			property: string;
			value: string | boolean;
			comparison: (typeof ComparisonOperator)[keyof typeof ComparisonOperator];
		}[] = [];
		if (Is.stringValue(accountId)) {
			conditions.push({
				property: "accountId",
				value: accountId,
				comparison: ComparisonOperator.Equals
			});
		}
		const queryType = Is.stringValue(type) ? AccountDataHelper.normaliseType(type) : undefined;
		const normalisedExcludeTypes = (excludeTypes ?? []).map(excludeType =>
			AccountDataHelper.normaliseType(excludeType)
		);
		if (Is.stringValue(queryType)) {
			conditions.push({
				property: "type",
				value: queryType,
				comparison: ComparisonOperator.Equals
			});
		} else {
			for (const excludeType of normalisedExcludeTypes) {
				conditions.push({
					property: "type",
					value: excludeType,
					comparison: ComparisonOperator.NotEquals
				});
			}
		}

		const result = await storage.query(
			conditions.length > 0 ? { conditions, logicalOperator: LogicalOperator.And } : undefined,
			undefined,
			undefined,
			cursor,
			limit
		);

		// Storage may compare without case or accents, so only exact matches are returned.
		const entities = (result.entities as AccountData[])
			.filter(
				item =>
					(!Is.stringValue(accountId) || item.accountId === accountId) &&
					(Is.stringValue(queryType)
						? item.type === queryType
						: !normalisedExcludeTypes.includes(item.type))
			)
			.map(item => AccountDataHelper.toData(item));
		return { entities, cursor: result.cursor };
	}

	/**
	 * Get the item of a type to use first for an account, the default item, otherwise the earliest created.
	 * @param storage The entity storage for account data.
	 * @param accountId The account id.
	 * @param type The type of the item.
	 * @returns The item, or undefined when the account has none of the type.
	 */
	public static async getDefault(
		storage: IEntityStorageConnector<AccountData>,
		accountId: string,
		type: string
	): Promise<IAuthenticationAccountData | undefined> {
		Guards.stringValue(AccountDataHelper.CLASS_NAME, nameof(accountId), accountId);
		type = AccountDataHelper.normaliseType(type);

		// A single scan in creation order, the default is returned as soon as it is read, otherwise the
		// earliest item once every item of the type has been read. An account holds few items of a
		// type, so this is usually one page, rather than a query for the default followed by a second
		// query that reads the same items again.
		let earliest: IAuthenticationAccountData | undefined;
		let cursor: string | undefined;
		do {
			const page = await storage.query(
				AccountDataHelper.typeCondition(accountId, type),
				[{ property: "dateCreated", sortDirection: SortDirection.Ascending }],
				undefined,
				cursor,
				AccountDataHelper._FIND_PAGE_SIZE
			);
			// Storage may compare without case or accents, so only exact matches are used.
			const matches = (page.entities as AccountData[]).filter(
				item => item.accountId === accountId && item.type === type
			);
			for (const item of matches) {
				if (item.isDefault) {
					return AccountDataHelper.toData(item);
				}
				earliest ??= AccountDataHelper.toData(item);
			}
			cursor = page.cursor;
		} while (Is.stringValue(cursor));
		return earliest;
	}

	/**
	 * Read every item of a type of an account. Every page is read, as only exact matches are kept
	 * from a page, so a short or empty page can still have a cursor.
	 * @param storage The entity storage for account data.
	 * @param accountId The account id.
	 * @param type The type of the items.
	 * @returns The items.
	 */
	public static async queryAll(
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
	 * Store the avatar of an account, replacing the value of the avatar it has, so an account holds
	 * one avatar, the default. Any other avatar is removed.
	 * @param storage The entity storage for account data.
	 * @param accountId The account id.
	 * @param data The value of the avatar.
	 * @param existing The avatar items of the account the caller has already read, read here when omitted.
	 * @returns The unique identifier of the avatar item.
	 */
	public static async replaceAvatar(
		storage: IEntityStorageConnector<AccountData>,
		accountId: string,
		data: unknown,
		existing?: IAuthenticationAccountData[]
	): Promise<string> {
		const avatars =
			existing ??
			(await AccountDataHelper.queryAll(storage, accountId, AuthenticationAccountDataType.Avatar));
		const kept = avatars.find(item => item.isDefault) ?? avatars[0];
		if (!Is.object(kept)) {
			return AccountDataHelper.create(
				storage,
				accountId,
				AuthenticationAccountDataType.Avatar,
				data,
				true
			);
		}
		for (const item of avatars) {
			if (item.id !== kept.id) {
				await AccountDataHelper.removeItem(storage, item);
			}
		}
		await AccountDataHelper.updateItem(storage, kept, data, true);
		return kept.id;
	}

	/**
	 * Check whether there is an organization item for an organization, through its indexed column.
	 * @param storage The entity storage for account data.
	 * @param organization The DID of the organization.
	 * @param accountId The account of the item, any account when omitted.
	 * @returns True when an item exists.
	 */
	public static async hasOrganizationItem(
		storage: IEntityStorageConnector<AccountData>,
		organization: string,
		accountId?: string
	): Promise<boolean> {
		Guards.stringValue(AccountDataHelper.CLASS_NAME, nameof(organization), organization);
		const conditions: {
			property: string;
			value: string;
			comparison: (typeof ComparisonOperator)[keyof typeof ComparisonOperator];
		}[] = [
			{ property: "organization", value: organization, comparison: ComparisonOperator.Equals }
		];
		if (Is.stringValue(accountId)) {
			conditions.push({
				property: "accountId",
				value: accountId,
				comparison: ComparisonOperator.Equals
			});
		}

		// Usually a single item is read, more only when storage compares without case or accents
		// and returns near matches first.
		let cursor: string | undefined;
		do {
			const page = await storage.query(
				{ conditions, logicalOperator: LogicalOperator.And },
				undefined,
				["accountId", "type", "organization"],
				cursor,
				1
			);
			if (
				page.entities.some(
					item =>
						item.organization === organization &&
						item.type === AuthenticationAccountDataType.Organization &&
						(!Is.stringValue(accountId) || item.accountId === accountId)
				)
			) {
				return true;
			}
			cursor = page.cursor;
		} while (Is.stringValue(cursor));
		return false;
	}

	/**
	 * Check the value of a verifiable credential item, a JSON credential object with a context, the
	 * VerifiableCredential type, an issuer, a credential subject and a proof.
	 * @param data The value.
	 * @returns True when it is valid.
	 */
	public static isCredential(data: unknown): boolean {
		return !Is.undefined(AuthenticationAccountHelper.getCredential(data));
	}

	/**
	 * Clear the default flag on the items of a type for an account.
	 * @param storage The entity storage for account data.
	 * @param accountId The account id.
	 * @param type The type of the items.
	 * @returns A promise that resolves when the flags have been cleared.
	 * @internal
	 */
	private static async clearDefault(
		storage: IEntityStorageConnector<AccountData>,
		accountId: string,
		type: string
	): Promise<void> {
		// Clearing the default and setting the new one are separate writes, so concurrent writes can
		// leave several defaults. Every page is read before any is cleared, as clearing changes the
		// field the query filters on and so the pages a cursor would return.
		const defaults: AccountData[] = [];
		let cursor: string | undefined;
		do {
			const page = await storage.query(
				AccountDataHelper.typeCondition(accountId, type, true),
				undefined,
				undefined,
				cursor
			);
			// Storage may compare without case or accents, so only exact matches are cleared.
			defaults.push(
				...(page.entities as AccountData[]).filter(
					item => item.isDefault && item.accountId === accountId && item.type === type
				)
			);
			cursor = page.cursor;
		} while (Is.stringValue(cursor));
		for (const item of defaults) {
			await storage.set({ ...item, isDefault: false, dateModified: new Date().toISOString() });
		}
	}

	/**
	 * Clear the cached request context of an account when an item it is resolved from changes.
	 * @param accountId The account id.
	 * @param type The type of the item that changed.
	 * @returns A promise that resolves when the account has been cleared.
	 * @internal
	 */
	private static async invalidate(accountId: string, type: string): Promise<void> {
		if (AccountDataHelper.isType(type, ...AccountDataHelper._CONTEXT_TYPES)) {
			await AccountContextCache.invalidate(accountId);
		}
	}

	/**
	 * Get the organization DID kept in the queryable column of an item.
	 * @param type The normalised type of the item.
	 * @param data The value of the item.
	 * @returns The DID for an organization item, otherwise undefined.
	 * @internal
	 */
	private static organizationOf(type: string, data: unknown): string | undefined {
		return type === AuthenticationAccountDataType.Organization
			? AuthenticationAccountHelper.getOrganization(data)
			: undefined;
	}

	/**
	 * Check a value is a well formed DID.
	 * @param value The value.
	 * @returns True when it is.
	 * @internal
	 */
	private static isDid(value: unknown): boolean {
		const parts = Urn.tryParseExact(value)?.parts();
		return Is.arrayValue(parts) && parts.length >= 3 && parts[0] === "did";
	}

	/**
	 * Get the item to return from the one stored, without the columns kept for queries.
	 * @param item The item as stored.
	 * @returns The item.
	 * @internal
	 */
	private static toData(item: AccountData): IAuthenticationAccountData {
		return {
			id: item.id,
			accountId: item.accountId,
			type: item.type,
			data: item.data,
			isDefault: item.isDefault,
			dateCreated: item.dateCreated,
			dateModified: item.dateModified
		};
	}

	/**
	 * Check a width or height of an avatar, optional, otherwise a positive integer up to the limit.
	 * @param value The value.
	 * @returns True when the value is valid.
	 * @internal
	 */
	private static isDimension(value: unknown): boolean {
		return (
			Is.undefined(value) ||
			(Is.integer(value) && value > 0 && value <= AccountDataHelper.AVATAR_MAX_DIMENSION)
		);
	}

	/**
	 * Build the condition for the items of a type for an account.
	 * @param accountId The account id.
	 * @param type The type of the items.
	 * @param isDefault Only the default items when true.
	 * @returns The condition.
	 * @internal
	 */
	private static typeCondition(
		accountId: string,
		type: string,
		isDefault?: boolean
	): {
		conditions: {
			property: string;
			value: string | boolean;
			comparison: (typeof ComparisonOperator)[keyof typeof ComparisonOperator];
		}[];
		logicalOperator: (typeof LogicalOperator)[keyof typeof LogicalOperator];
	} {
		const conditions: {
			property: string;
			value: string | boolean;
			comparison: (typeof ComparisonOperator)[keyof typeof ComparisonOperator];
		}[] = [
			{ property: "accountId", value: accountId, comparison: ComparisonOperator.Equals },
			{ property: "type", value: type, comparison: ComparisonOperator.Equals }
		];
		if (isDefault === true) {
			conditions.push({
				property: "isDefault",
				value: true,
				comparison: ComparisonOperator.Equals
			});
		}
		return { conditions, logicalOperator: LogicalOperator.And };
	}
}
