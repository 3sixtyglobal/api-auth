// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { entity, property, SortDirection } from "@3sixty/entity";

/**
 * Class defining the storage for an item of account data.
 */
@entity()
export class AccountData {
	/**
	 * The unique identifier of the item.
	 */
	@property({ type: "string", isPrimary: true })
	public id!: string;

	/**
	 * The account the item belongs to.
	 */
	@property({
		type: "string",
		maxLength: 255,
		isSecondary: true,
		indexGroup: [{ name: "accountTypeDate", direction: SortDirection.Ascending, index: 0 }]
	})
	public accountId!: string;

	/**
	 * The type of the item, such as identity or public-profile, stored in kebab case.
	 */
	@property({
		type: "string",
		maxLength: 100,
		isSecondary: true,
		indexGroup: [{ name: "accountTypeDate", direction: SortDirection.Ascending, index: 1 }]
	})
	public type!: string;

	/**
	 * The value of the item, a JSON object.
	 */
	@property({ type: "object" })
	public data!: unknown;

	/**
	 * The DID of the organization for an organization item, so the members of an organization can be
	 * queried, as the value is not.
	 */
	@property({ type: "string", maxLength: 255, isSecondary: true, optional: true })
	public organization?: string;

	/**
	 * The revocation index the node allocated for the membership credential it issued for an
	 * organization item, so the credential can be revoked when the membership ends. Only written by
	 * the node and never returned.
	 */
	@property({ type: "integer", optional: true })
	public revocationIndex?: number;

	/**
	 * True for the item of its type to use first, otherwise the earliest created item is used.
	 */
	@property({ type: "boolean" })
	public isDefault!: boolean;

	/**
	 * When the item was created, in ISO date format.
	 */
	@property({
		type: "string",
		format: "date-time",
		sortDirection: SortDirection.Ascending,
		indexGroup: [{ name: "accountTypeDate", direction: SortDirection.Ascending, index: 2 }]
	})
	public dateCreated!: string;

	/**
	 * When the item was last modified, in ISO date format.
	 */
	@property({ type: "string", format: "date-time" })
	public dateModified!: string;
}
