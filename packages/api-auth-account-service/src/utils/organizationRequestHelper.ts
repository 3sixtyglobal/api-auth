// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { type IOrganizationRequest, OrganizationRequestStatus } from "@3sixty/api-auth-models";
import { Guards, Is, NotFoundError } from "@3sixty/core";
import { ComparisonOperator, LogicalOperator, SortDirection } from "@3sixty/entity";
import type { IEntityStorageConnector } from "@3sixty/entity-storage-models";
import { nameof } from "@3sixty/nameof";
import type { OrganizationRequest } from "../entities/organizationRequest.js";

/**
 * Helper class for the requests to join an organization, shared by the account and admin services.
 */
export class OrganizationRequestHelper {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<OrganizationRequestHelper>();

	/**
	 * The most requests a count reads, so counting stays bounded on every storage.
	 */
	public static readonly COUNT_CAP: number = 1000;

	/**
	 * Get a request.
	 * @param storage The entity storage for the requests.
	 * @param id The unique identifier of the request.
	 * @returns The request.
	 * @throws NotFoundError when the request does not exist.
	 */
	public static async get(
		storage: IEntityStorageConnector<OrganizationRequest>,
		id: string
	): Promise<IOrganizationRequest> {
		Guards.stringValue(OrganizationRequestHelper.CLASS_NAME, nameof(id), id);

		const request = await storage.get(id);
		if (!Is.object<OrganizationRequest>(request)) {
			throw new NotFoundError(
				OrganizationRequestHelper.CLASS_NAME,
				"organizationRequestNotFound",
				id
			);
		}
		return request;
	}

	/**
	 * Get the request of an account that was changed last.
	 * @param storage The entity storage for the requests.
	 * @param accountId The account id.
	 * @returns The request, or undefined when the account has made none.
	 */
	public static async getLatest(
		storage: IEntityStorageConnector<OrganizationRequest>,
		accountId: string
	): Promise<IOrganizationRequest | undefined> {
		Guards.stringValue(OrganizationRequestHelper.CLASS_NAME, nameof(accountId), accountId);
		const result = await storage.query(
			{ property: "accountId", value: accountId, comparison: ComparisonOperator.Equals },
			[{ property: "dateModified", sortDirection: SortDirection.Descending }],
			undefined,
			undefined,
			1
		);
		return result.entities[0] as IOrganizationRequest | undefined;
	}

	/**
	 * Find the pending request of an account and the request changed last, reading its requests once.
	 * @param storage The entity storage for the requests.
	 * @param accountId The account id.
	 * @returns A pending request, and the latest request, each undefined when there is none.
	 */
	public static async findForAccount(
		storage: IEntityStorageConnector<OrganizationRequest>,
		accountId: string
	): Promise<{ pending?: IOrganizationRequest; latest?: IOrganizationRequest }> {
		Guards.stringValue(OrganizationRequestHelper.CLASS_NAME, nameof(accountId), accountId);

		// The latest is read first, an account makes few requests so this is usually one page, and the
		// reading stops at the first pending request.
		let latest: IOrganizationRequest | undefined;
		let cursor: string | undefined;
		do {
			const page = await storage.query(
				{ property: "accountId", value: accountId, comparison: ComparisonOperator.Equals },
				[{ property: "dateModified", sortDirection: SortDirection.Descending }],
				undefined,
				cursor
			);
			const requests = page.entities as IOrganizationRequest[];
			latest ??= requests[0];
			const pending = requests.find(
				request => request.status === OrganizationRequestStatus.Pending
			);
			if (Is.object(pending)) {
				return { pending, latest };
			}
			cursor = page.cursor;
		} while (Is.stringValue(cursor));
		return { latest };
	}

	/**
	 * Find a pending request of an account.
	 * @param storage The entity storage for the requests.
	 * @param accountId The account id.
	 * @param organization The DID of the organization, any organization when omitted.
	 * @returns The request, or undefined when none is pending.
	 */
	public static async findPending(
		storage: IEntityStorageConnector<OrganizationRequest>,
		accountId: string,
		organization?: string
	): Promise<IOrganizationRequest | undefined> {
		const pending = await OrganizationRequestHelper.readPending(
			storage,
			accountId,
			organization,
			true
		);
		return pending[0];
	}

	/**
	 * Find every pending request of an account.
	 * @param storage The entity storage for the requests.
	 * @param accountId The account id.
	 * @param organization The DID of the organization, any organization when omitted.
	 * @returns The requests.
	 */
	public static async findAllPending(
		storage: IEntityStorageConnector<OrganizationRequest>,
		accountId: string,
		organization?: string
	): Promise<IOrganizationRequest[]> {
		return OrganizationRequestHelper.readPending(storage, accountId, organization, false);
	}

	/**
	 * Find the latest request of an account to each organization, pending or answered.
	 * @param storage The entity storage for the requests.
	 * @param accountId The account id.
	 * @returns The requests, the latest changed first.
	 */
	public static async findLatestByOrganization(
		storage: IEntityStorageConnector<OrganizationRequest>,
		accountId: string
	): Promise<IOrganizationRequest[]> {
		Guards.stringValue(OrganizationRequestHelper.CLASS_NAME, nameof(accountId), accountId);

		// A pending request is the latest to its organization, as another is refused while one is
		// pending, so it is kept even when an answered one was changed in the same millisecond.
		const latest = new Map<string, IOrganizationRequest>();
		let cursor: string | undefined;
		do {
			const page = await storage.query(
				{ property: "accountId", value: accountId, comparison: ComparisonOperator.Equals },
				[{ property: "dateModified", sortDirection: SortDirection.Descending }],
				undefined,
				cursor
			);
			for (const request of page.entities as IOrganizationRequest[]) {
				const kept = latest.get(request.organization);
				if (
					Is.undefined(kept) ||
					(kept.status !== OrganizationRequestStatus.Pending &&
						request.status === OrganizationRequestStatus.Pending)
				) {
					latest.set(request.organization, request);
				}
			}
			cursor = page.cursor;
		} while (Is.stringValue(cursor));
		return [...latest.values()];
	}

	/**
	 * Query the requests, the earliest first.
	 * @param storage The entity storage for the requests.
	 * @param status The status of the requests to return, all when omitted.
	 * @param organization The organization, or organizations, of the requests to return, all when omitted.
	 * @param cursor The cursor to request the next page.
	 * @param limit The maximum number of requests to return.
	 * @returns The requests and a cursor when there are more.
	 */
	public static async query(
		storage: IEntityStorageConnector<OrganizationRequest>,
		status?: OrganizationRequestStatus,
		organization?: string | string[],
		cursor?: string,
		limit?: number
	): Promise<{
		entities: IOrganizationRequest[];
		cursor?: string;
	}> {
		const conditions: {
			property: string;
			value: string | string[];
			comparison: (typeof ComparisonOperator)[keyof typeof ComparisonOperator];
		}[] = [];
		if (Is.stringValue(status)) {
			conditions.push({ property: "status", value: status, comparison: ComparisonOperator.Equals });
		}
		OrganizationRequestHelper.addOrganizationCondition(conditions, organization);

		const result = await storage.query(
			conditions.length > 0 ? { conditions, logicalOperator: LogicalOperator.And } : undefined,
			[{ property: "dateCreated", sortDirection: SortDirection.Ascending }],
			undefined,
			cursor,
			limit
		);

		return {
			entities: result.entities as IOrganizationRequest[],
			cursor: result.cursor
		};
	}

	/**
	 * Count the requests of a status up to a cap. Storage count is not used, as some storage reads
	 * every match to count, so the matches are read a page at a time and the reading stops past the
	 * cap.
	 * @param storage The entity storage for the requests.
	 * @param status The status of the requests to count.
	 * @param organization The organization, or organizations, of the requests to count, all when omitted.
	 * @param cap The most requests counted.
	 * @returns The number of requests, the cap when there are more, and whether there are more.
	 */
	public static async count(
		storage: IEntityStorageConnector<OrganizationRequest>,
		status: OrganizationRequestStatus,
		organization: string | string[] | undefined,
		cap: number = OrganizationRequestHelper.COUNT_CAP
	): Promise<{ count: number; capped: boolean }> {
		const conditions: {
			property: string;
			value: string | string[];
			comparison: (typeof ComparisonOperator)[keyof typeof ComparisonOperator];
		}[] = [{ property: "status", value: status, comparison: ComparisonOperator.Equals }];
		OrganizationRequestHelper.addOrganizationCondition(conditions, organization);

		let count = 0;
		let cursor: string | undefined;
		do {
			const page = await storage.query(
				{ conditions, logicalOperator: LogicalOperator.And },
				undefined,
				["id"],
				cursor,
				// One past the cap, so reaching it shows there are more.
				cap + 1 - count
			);
			count += page.entities.length;
			cursor = page.cursor;
		} while (Is.stringValue(cursor) && count <= cap);

		return count > cap ? { count: cap, capped: true } : { count, capped: false };
	}

	/**
	 * Add the condition on the organization of the requests.
	 * @param conditions The conditions to add to.
	 * @param organization The organization, or organizations, none when omitted.
	 * @internal
	 */
	private static addOrganizationCondition(
		conditions: {
			property: string;
			value: string | string[];
			comparison: (typeof ComparisonOperator)[keyof typeof ComparisonOperator];
		}[],
		organization: string | string[] | undefined
	): void {
		if (Is.array<string>(organization)) {
			conditions.push({
				property: "organization",
				value: organization,
				comparison: ComparisonOperator.In
			});
		} else if (Is.stringValue(organization)) {
			conditions.push({
				property: "organization",
				value: organization,
				comparison: ComparisonOperator.Equals
			});
		}
	}

	/**
	 * Read the pending requests of an account.
	 * @param storage The entity storage for the requests.
	 * @param accountId The account id.
	 * @param organization The DID of the organization, any organization when omitted.
	 * @param firstOnly True to stop at the first match.
	 * @returns The requests.
	 * @internal
	 */
	private static async readPending(
		storage: IEntityStorageConnector<OrganizationRequest>,
		accountId: string,
		organization: string | undefined,
		firstOnly: boolean
	): Promise<IOrganizationRequest[]> {
		Guards.stringValue(OrganizationRequestHelper.CLASS_NAME, nameof(accountId), accountId);
		const conditions: {
			property: string;
			value: string;
			comparison: (typeof ComparisonOperator)[keyof typeof ComparisonOperator];
		}[] = [
			{ property: "accountId", value: accountId, comparison: ComparisonOperator.Equals },
			{
				property: "status",
				value: OrganizationRequestStatus.Pending,
				comparison: ComparisonOperator.Equals
			}
		];
		if (Is.stringValue(organization)) {
			conditions.push({
				property: "organization",
				value: organization,
				comparison: ComparisonOperator.Equals
			});
		}

		const matches: IOrganizationRequest[] = [];
		let cursor: string | undefined;
		do {
			const page = await storage.query(
				{ conditions, logicalOperator: LogicalOperator.And },
				undefined,
				undefined,
				cursor,
				firstOnly ? 1 : undefined
			);
			matches.push(...(page.entities as IOrganizationRequest[]));
			cursor = firstOnly ? undefined : page.cursor;
		} while (Is.stringValue(cursor));
		return matches;
	}
}
