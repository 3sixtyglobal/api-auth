// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import {
	AuthenticationAccountDataType,
	AuthenticationAccountHelper,
	ExportFileHelper,
	ExportFileType,
	type IAccountProfileExport,
	type IAccountProfileExportItem,
	type IAccountProfileImportResult,
	type IAuthenticationAccountData
} from "@3sixty/api-auth-models";
import {
	Converter,
	GeneralError,
	Guards,
	Is,
	StringHelper,
	UnprocessableError
} from "@3sixty/core";
import type { IEntityStorageConnector } from "@3sixty/entity-storage-models";
import { nameof } from "@3sixty/nameof";
import { AccountDataHelper } from "./accountDataHelper.js";
import type { AccountData } from "../entities/accountData.js";

/**
 * Helper class for exporting the account data of an account and replacing it with an export.
 */
export class AccountProfileHelper {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<AccountProfileHelper>();

	/**
	 * The default most items an import may hold.
	 */
	public static readonly DEFAULT_MAX_ITEMS: number = 1000;

	/**
	 * The default largest size of the items of an import as JSON, in bytes.
	 */
	public static readonly DEFAULT_MAX_BYTES: number = 1048576;

	/**
	 * The types left out of an export and refused in an import, the identity, organizations and
	 * credentials move with the identity export, and the node migration records stay on the node.
	 */
	public static readonly EXCLUDED_TYPES: string[] = [
		AuthenticationAccountDataType.Identity,
		AuthenticationAccountDataType.Organization,
		AuthenticationAccountDataType.VerifiableCredential,
		AccountDataHelper.MIGRATION_TYPE
	];

	/**
	 * Export the account data of an account, other than the excluded types and the items only admins
	 * may see, in creation order.
	 * @param storage The entity storage for account data.
	 * @param accountId The account id.
	 * @returns The export.
	 */
	public static async export(
		storage: IEntityStorageConnector<AccountData>,
		accountId: string
	): Promise<IAccountProfileExport> {
		const items = await AccountProfileHelper.loadItems(storage, accountId);
		return {
			type: ExportFileType.AccountProfile,
			version: ExportFileHelper.VERSION,
			items: items.map(item => ({
				type: item.type,
				data: item.data,
				isDefault: item.isDefault,
				dateCreated: item.dateCreated
			}))
		};
	}

	/**
	 * Replace the account data of an account with an export. The export is checked in full first,
	 * then its items are created, and only then are the existing items of the types it may hold
	 * removed, so a failure leaves the existing items. The types of which the account holds a read
	 * only item, such as a profile owned by an authentication provider, or an item only admins may
	 * see, are left as they are, and read only items in the export are left out. The items only
	 * admins may see are never removed.
	 * @param storage The entity storage for account data.
	 * @param accountId The account id.
	 * @param profile The export.
	 * @param limits The limits of an import.
	 * @param limits.maxItems The most items an import may hold.
	 * @param limits.maxBytes The largest size of the items as JSON, in bytes.
	 * @returns What was imported and removed.
	 * @throws UnprocessableError when the export is not valid or too large.
	 */
	public static async import(
		storage: IEntityStorageConnector<AccountData>,
		accountId: string,
		profile: IAccountProfileExport,
		limits: { maxItems: number; maxBytes: number }
	): Promise<IAccountProfileImportResult> {
		Guards.stringValue(AccountProfileHelper.CLASS_NAME, nameof(accountId), accountId);
		const items = await AccountProfileHelper.validate(profile, limits);

		const existing = await AccountProfileHelper.loadItems(storage, accountId, true);
		const readOnlyTypes = new Set(
			existing
				.filter(
					item => item.adminOnly === true || AuthenticationAccountHelper.isReadOnly(item.data)
				)
				.map(item => item.type)
		);

		const skippedTypes = new Set<string>();
		const defaultTypes = new Set<string>();
		const toCreate: IAccountProfileExportItem[] = [];
		for (const item of items) {
			if (readOnlyTypes.has(item.type) || AuthenticationAccountHelper.isReadOnly(item.data)) {
				skippedTypes.add(item.type);
			} else {
				// Only the first default of a type is kept.
				const isDefault = item.isDefault === true && !defaultTypes.has(item.type);
				if (isDefault) {
					defaultTypes.add(item.type);
				}
				toCreate.push({ type: item.type, data: item.data, isDefault });
			}
		}

		const created: string[] = [];
		try {
			for (const item of toCreate) {
				// The existing items of the type are removed below, so their defaults are not cleared.
				created.push(
					await AccountDataHelper.create(
						storage,
						accountId,
						item.type,
						item.data,
						item.isDefault,
						undefined,
						{ hasNoItems: true }
					)
				);
			}
		} catch (error) {
			for (const id of created) {
				try {
					await storage.remove(id);
				} catch {
					// Each item is removed on its own, so one failure does not leave the others, and the
					// error of the import is the one reported.
				}
			}
			throw new GeneralError(
				AccountProfileHelper.CLASS_NAME,
				"profileImportFailed",
				undefined,
				error
			);
		}

		const toRemove = existing.filter(
			item => !readOnlyTypes.has(item.type) && item.adminOnly !== true
		);
		for (const item of toRemove) {
			await AccountDataHelper.removeItem(storage, item);
		}

		return {
			itemsImported: created.length,
			itemsRemoved: toRemove.length,
			skippedTypes: [...skippedTypes]
		};
	}

	/**
	 * Check an export, returning its items with their types normalised.
	 * @param profile The export.
	 * @param limits The limits of an import.
	 * @param limits.maxItems The most items an import may hold.
	 * @param limits.maxBytes The largest size of the items as JSON, in bytes.
	 * @returns The items.
	 * @throws UnprocessableError when the export is not valid or too large.
	 */
	public static async validate(
		profile: IAccountProfileExport,
		limits: { maxItems: number; maxBytes: number }
	): Promise<IAccountProfileExportItem[]> {
		ExportFileHelper.guard(profile, ExportFileType.AccountProfile);
		if (!Is.array(profile.items)) {
			throw new UnprocessableError(AccountProfileHelper.CLASS_NAME, "profileInvalid");
		}
		if (profile.items.length > limits.maxItems) {
			throw new UnprocessableError(AccountProfileHelper.CLASS_NAME, "profileTooManyItems", {
				maxItems: limits.maxItems
			});
		}
		if (Converter.utf8ToBytes(JSON.stringify(profile.items)).length > limits.maxBytes) {
			throw new UnprocessableError(AccountProfileHelper.CLASS_NAME, "profileTooLarge", {
				maxBytes: limits.maxBytes
			});
		}

		const items: IAccountProfileExportItem[] = [];
		for (const [index, item] of profile.items.entries()) {
			const type = Is.object<IAccountProfileExportItem>(item)
				? StringHelper.kebabCase(Is.string(item.type) ? item.type : "", false)
				: "";
			if (
				!Is.stringValue(type) ||
				Is.undefined(item.data) ||
				Is.null(item.data) ||
				!(Is.undefined(item.isDefault) || Is.boolean(item.isDefault))
			) {
				throw new UnprocessableError(AccountProfileHelper.CLASS_NAME, "profileItemInvalid", {
					index
				});
			}
			if (AccountDataHelper.isType(type, ...AccountProfileHelper.EXCLUDED_TYPES)) {
				throw new UnprocessableError(AccountProfileHelper.CLASS_NAME, "profileTypeNotAllowed", {
					type
				});
			}
			// Checked before anything is stored, so a failure leaves the existing items. Read only items
			// are left out of the import, so are not checked.
			if (!AuthenticationAccountHelper.isReadOnly(item.data)) {
				await AccountDataHelper.validateData(type, item.data);
			}
			items.push({ type, data: item.data, isDefault: item.isDefault });
		}
		return items;
	}

	/**
	 * Read the items of an account other than the excluded types, in creation order.
	 * @param storage The entity storage for account data.
	 * @param accountId The account id.
	 * @param includeAdminOnly True to include the items only admins may see.
	 * @returns The items.
	 * @internal
	 */
	private static async loadItems(
		storage: IEntityStorageConnector<AccountData>,
		accountId: string,
		includeAdminOnly?: boolean
	): Promise<IAuthenticationAccountData[]> {
		const items: IAuthenticationAccountData[] = [];
		let cursor: string | undefined;
		do {
			const page = await AccountDataHelper.query(
				storage,
				accountId,
				undefined,
				cursor,
				undefined,
				AccountProfileHelper.EXCLUDED_TYPES,
				includeAdminOnly !== true
			);
			items.push(...page.entities);
			cursor = page.cursor;
		} while (Is.stringValue(cursor));
		// The sort is stable, so items created in the same millisecond keep the order storage gives.
		return items.sort((a, b) => a.dateCreated.localeCompare(b.dateCreated));
	}
}
