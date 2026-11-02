// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import {
	AuthenticationAccountDataType,
	type IOrganization,
	type IOrganizationProfileUpdate
} from "@3sixty/api-auth-models";
import { Is } from "@3sixty/core";
import { ComparisonOperator, LogicalOperator } from "@3sixty/entity";
import type { IEntityStorageConnector } from "@3sixty/entity-storage-models";
import { nameof } from "@3sixty/nameof";
import { AccountDataHelper } from "./accountDataHelper.js";
import { OrganizationHelper } from "./organizationHelper.js";
import { PublicDataHelper } from "./publicDataHelper.js";
import type { AccountData } from "../entities/accountData.js";

/**
 * Helper class for the profile, logo and public data of an organization, shared by the organization
 * service and the account service that creates an organization for the signed in account.
 */
export class OrganizationProfileHelper {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<OrganizationProfileHelper>();

	/**
	 * Read the profile, logo and public data of an organization.
	 * @param storage The entity storage for account data.
	 * @param identity The DID of the organization.
	 * @returns The profile, logo and public data.
	 */
	public static async load(
		storage: IEntityStorageConnector<AccountData>,
		identity: string
	): Promise<Pick<IOrganization, "profile" | "logo" | "publicData">> {
		const [profile, logo, publicData] = await Promise.all([
			AccountDataHelper.getDefault(storage, identity, AuthenticationAccountDataType.Profile),
			AccountDataHelper.getDefault(storage, identity, AuthenticationAccountDataType.Logo),
			AccountDataHelper.getDefault(storage, identity, AuthenticationAccountDataType.PublicData)
		]);
		return {
			profile: profile?.data as IOrganization["profile"],
			logo: logo?.data as IOrganization["logo"],
			publicData: PublicDataHelper.getPaths(publicData?.data)
		};
	}

	/**
	 * Check the changes before anything is stored.
	 * @param changes The changes.
	 * @throws UnprocessableError when the profile, logo or public data is not valid.
	 */
	public static validate(changes: IOrganizationProfileUpdate): void {
		if (!Is.undefined(changes.profile)) {
			AccountDataHelper.validateData(AuthenticationAccountDataType.Profile, changes.profile);
		}
		if (!Is.undefined(changes.logo) && !Is.null(changes.logo)) {
			AccountDataHelper.validateData(AuthenticationAccountDataType.Logo, changes.logo);
		}
		if (!Is.undefined(changes.publicData)) {
			PublicDataHelper.validatePaths(changes.publicData);
		}
	}

	/**
	 * Store the changes as the default account data of the DID, replacing the existing items, a
	 * null logo removes it.
	 * @param storage The entity storage for account data.
	 * @param identity The DID of the organization.
	 * @param changes The changes, checked first.
	 * @param isNew True when the DID was just created, so it has no items to replace.
	 * @returns A promise that resolves when the changes have been stored.
	 * @throws UnprocessableError when the profile, logo or public data is not valid.
	 */
	public static async store(
		storage: IEntityStorageConnector<AccountData>,
		identity: string,
		changes: IOrganizationProfileUpdate,
		isNew: boolean
	): Promise<void> {
		OrganizationProfileHelper.validate(changes);
		const items: [string, unknown][] = [];
		if (Is.object(changes.profile)) {
			items.push([AuthenticationAccountDataType.Profile, changes.profile]);
		}
		if (Is.object(changes.logo)) {
			items.push([AuthenticationAccountDataType.Logo, changes.logo]);
		}
		if (Is.array(changes.publicData)) {
			items.push([
				AuthenticationAccountDataType.PublicData,
				PublicDataHelper.createData(changes.publicData)
			]);
		}

		// The items are of different types, so they are stored together.
		await Promise.all(
			items.map(async ([type, data]) => {
				const existing = isNew
					? undefined
					: await AccountDataHelper.getDefault(storage, identity, type);
				if (Is.object(existing)) {
					await AccountDataHelper.updateItem(storage, existing, data, true);
				} else {
					await AccountDataHelper.create(storage, identity, type, data, true, undefined, {
						hasNoItems: isNew
					});
				}
			})
		);

		if (Is.null(changes.logo) && !isNew) {
			const logos = await AccountDataHelper.queryAll(
				storage,
				identity,
				AuthenticationAccountDataType.Logo
			);
			for (const item of logos) {
				await AccountDataHelper.removeItem(storage, item);
			}
		}
	}

	/**
	 * Remove the account data of an organization, keeping the revocation index it reached for when
	 * its DID is registered again.
	 * @param storage The entity storage for account data.
	 * @param identity The DID of the organization.
	 * @returns A promise that resolves when the items have been removed.
	 */
	public static async removeAll(
		storage: IEntityStorageConnector<AccountData>,
		identity: string
	): Promise<void> {
		// An organization holds few items, so they are collected before removing them.
		const retiredId = OrganizationHelper.retiredRevocationIndexId(identity);
		const ids: string[] = [];
		let cursor: string | undefined;
		do {
			const page = await storage.query(
				{
					conditions: [
						{ property: "accountId", value: identity, comparison: ComparisonOperator.Equals },
						{ property: "id", value: retiredId, comparison: ComparisonOperator.NotEquals }
					],
					logicalOperator: LogicalOperator.And
				},
				undefined,
				["id"],
				cursor
			);
			ids.push(...page.entities.map(item => item.id as string));
			cursor = page.cursor;
		} while (Is.stringValue(cursor));
		for (const id of ids) {
			await storage.remove(id);
		}
	}
}
