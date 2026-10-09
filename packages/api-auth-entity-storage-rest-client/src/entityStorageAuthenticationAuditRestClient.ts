// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type {
	AuthAuditEvent,
	IAuditCreateRequest,
	IAuditGetRequest,
	IAuditGetResponse,
	IAuditQueryRequest,
	IAuditQueryResponse,
	IAuditRemoveRequest,
	IAuditUpdateRequest,
	IAuthenticationAuditComponent,
	IAuthenticationAuditEntry
} from "@3sixty/api-auth-entity-storage-models";
import { BaseRestClient } from "@3sixty/api-core";
import { HttpHeaderHelper } from "@3sixty/api-models";
import type {
	IBaseRestClientConfig,
	ICreatedResponse,
	INoContentResponse
} from "@3sixty/api-models";
import { Coerce, Guards } from "@3sixty/core";
import { nameof } from "@3sixty/nameof";
import { HttpMethod } from "@3sixty/web";

/**
 * The client to connect to the authentication audit service.
 */
export class EntityStorageAuthenticationAuditRestClient
	extends BaseRestClient
	implements IAuthenticationAuditComponent
{
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<EntityStorageAuthenticationAuditRestClient>();

	/**
	 * Create a new instance of EntityStorageAuthenticationAuditRestClient.
	 * @param config The configuration for the client.
	 */
	constructor(config: IBaseRestClientConfig) {
		super(nameof<EntityStorageAuthenticationAuditRestClient>(), config, "authentication/audit");
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return EntityStorageAuthenticationAuditRestClient.CLASS_NAME;
	}

	/**
	 * Create a new audit entry.
	 * @param entry The audit entry to be logged.
	 * @returns The unique identifier of the created audit entry.
	 */
	public async create(
		entry: Omit<IAuthenticationAuditEntry, "id" | "dateCreated">
	): Promise<string> {
		Guards.object(EntityStorageAuthenticationAuditRestClient.CLASS_NAME, nameof(entry), entry);
		Guards.stringValue(
			EntityStorageAuthenticationAuditRestClient.CLASS_NAME,
			nameof(entry.event),
			entry.event
		);

		const response = await this.fetch<IAuditCreateRequest, ICreatedResponse>("/", "POST", {
			body: entry
		});

		return HttpHeaderHelper.extractId(response.headers, `${this.getPathPrefix()}/:id`);
	}

	/**
	 * Get an audit entry by id.
	 * @param id The unique identifier of the audit entry.
	 * @returns The audit entry.
	 */
	public async get(id: string): Promise<IAuthenticationAuditEntry> {
		Guards.stringValue(EntityStorageAuthenticationAuditRestClient.CLASS_NAME, nameof(id), id);

		const response = await this.fetch<IAuditGetRequest, IAuditGetResponse>("/:id", HttpMethod.GET, {
			pathParams: { id }
		});

		return response.body;
	}

	/**
	 * Update an audit entry.
	 * @param id The unique identifier of the audit entry to update.
	 * @param entry The fields to update on the audit entry.
	 * @returns A promise that resolves when the audit entry has been updated.
	 */
	public async update(
		id: string,
		entry: Partial<Omit<IAuthenticationAuditEntry, "id" | "dateCreated">>
	): Promise<void> {
		Guards.stringValue(EntityStorageAuthenticationAuditRestClient.CLASS_NAME, nameof(id), id);
		Guards.object(EntityStorageAuthenticationAuditRestClient.CLASS_NAME, nameof(entry), entry);

		await this.fetch<IAuditUpdateRequest, INoContentResponse>("/:id", HttpMethod.PUT, {
			pathParams: { id },
			body: entry
		});
	}

	/**
	 * Remove an audit entry.
	 * @param id The unique identifier of the audit entry to remove.
	 * @returns A promise that resolves when the audit entry has been removed.
	 */
	public async remove(id: string): Promise<void> {
		Guards.stringValue(EntityStorageAuthenticationAuditRestClient.CLASS_NAME, nameof(id), id);

		await this.fetch<IAuditRemoveRequest, INoContentResponse>("/:id", HttpMethod.DELETE, {
			pathParams: { id }
		});
	}

	/**
	 * Query the audit entries.
	 * @param options The query options.
	 * @param options.actorId The actor identifier to filter the audit entries, optional.
	 * @param options.organizationId The organization identifier to filter the audit entries, optional.
	 * @param options.tenantId The tenant identifier to filter the audit entries, optional.
	 * @param options.nodeId The node identifier to filter the audit entries, optional.
	 * @param options.event The audit event to filter the audit entries, optional.
	 * @param options.startDate The start date to filter the audit entries, optional.
	 * @param options.endDate The end date to filter the audit entries, optional.
	 * @param cursor The cursor for pagination.
	 * @param limit The maximum number of entries to return.
	 * @returns The audit entries.
	 */
	public async query(
		options?: {
			actorId?: string;
			organizationId?: string;
			tenantId?: string;
			nodeId?: string;
			event?: AuthAuditEvent | string;
			startDate?: string;
			endDate?: string;
		},
		cursor?: string,
		limit?: number
	): Promise<{
		entries: IAuthenticationAuditEntry[];
		cursor?: string;
	}> {
		const response = await this.fetch<IAuditQueryRequest, IAuditQueryResponse>("/", "GET", {
			query: {
				actorId: options?.actorId,
				organizationId: options?.organizationId,
				tenantId: options?.tenantId,
				nodeId: options?.nodeId,
				event: options?.event,
				startDate: options?.startDate,
				endDate: options?.endDate,
				cursor,
				limit: Coerce.string(limit)
			}
		});

		return {
			entries: response.body.entries,
			cursor: response.body.cursor
		};
	}
}
