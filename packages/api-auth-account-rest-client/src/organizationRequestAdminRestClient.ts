// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type {
	IOrganizationRequest,
	IOrganizationRequestAcceptRequest,
	IOrganizationRequestAdminComponent,
	IOrganizationRequestCount,
	IOrganizationRequestCountRequest,
	IOrganizationRequestCountResponse,
	IOrganizationRequestGetRequest,
	IOrganizationRequestGetResponse,
	IOrganizationRequestQueryRequest,
	IOrganizationRequestQueryResponse,
	IOrganizationRequestRejectRequest,
	IOrganizationRequestRemoveForAccountRequest,
	OrganizationRequestStatus
} from "@3sixty/api-auth-models";
import { BaseRestClient } from "@3sixty/api-core";
import type { IBaseRestClientConfig, INoContentResponse } from "@3sixty/api-models";
import { Coerce, Guards } from "@3sixty/core";
import { nameof } from "@3sixty/nameof";
import { HttpMethod } from "@3sixty/web";

/**
 * The client to connect to the service that reviews the requests to join an organization.
 */
export class OrganizationRequestAdminRestClient
	extends BaseRestClient
	implements IOrganizationRequestAdminComponent
{
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<OrganizationRequestAdminRestClient>();

	/**
	 * Create a new instance of OrganizationRequestAdminRestClient.
	 * @param config The configuration for the client.
	 */
	constructor(config: IBaseRestClientConfig) {
		super(
			nameof<OrganizationRequestAdminRestClient>(),
			config,
			"authentication/admin/organization-request"
		);
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return OrganizationRequestAdminRestClient.CLASS_NAME;
	}

	/**
	 * Get a request.
	 * @param id The unique identifier of the request.
	 * @returns The request.
	 */
	public async get(id: string): Promise<IOrganizationRequest> {
		Guards.stringValue(OrganizationRequestAdminRestClient.CLASS_NAME, nameof(id), id);

		const response = await this.fetch<
			IOrganizationRequestGetRequest,
			IOrganizationRequestGetResponse
		>("/:id", HttpMethod.GET, {
			pathParams: { id }
		});

		return response.body;
	}

	/**
	 * Query the requests, the earliest first.
	 * @param status The status of the requests to return, all when omitted.
	 * @param organization The organization of the requests to return, all when omitted.
	 * @param cursor The cursor to request the next page.
	 * @param limit The maximum number of requests to return.
	 * @returns The requests and a cursor when there are more.
	 */
	public async query(
		status?: OrganizationRequestStatus,
		organization?: string,
		cursor?: string,
		limit?: number
	): Promise<{
		entities: IOrganizationRequest[];
		cursor?: string;
	}> {
		const response = await this.fetch<
			IOrganizationRequestQueryRequest,
			IOrganizationRequestQueryResponse
		>("/", HttpMethod.GET, {
			query: {
				status,
				filterOrganization: organization,
				cursor,
				limit: Coerce.string(limit)
			}
		});

		return {
			entities: response.body.entities,
			cursor: response.body.cursor
		};
	}

	/**
	 * Count the requests of a status, up to a cap.
	 * @param status The status of the requests to count.
	 * @param organization The organization of the requests to count, all when omitted.
	 * @returns The number of requests, and whether there are more than the cap.
	 */
	public async countRequests(
		status: OrganizationRequestStatus,
		organization?: string
	): Promise<IOrganizationRequestCount> {
		Guards.stringValue(OrganizationRequestAdminRestClient.CLASS_NAME, nameof(status), status);

		const response = await this.fetch<
			IOrganizationRequestCountRequest,
			IOrganizationRequestCountResponse
		>("/count", HttpMethod.GET, {
			query: {
				status,
				filterOrganization: organization
			}
		});

		return response.body;
	}

	/**
	 * Accept a pending request.
	 * @param id The unique identifier of the request.
	 * @returns A promise that resolves when the account has joined the organization.
	 */
	public async accept(id: string): Promise<void> {
		Guards.stringValue(OrganizationRequestAdminRestClient.CLASS_NAME, nameof(id), id);

		await this.fetch<IOrganizationRequestAcceptRequest, INoContentResponse>(
			"/:id/accept",
			HttpMethod.POST,
			{
				pathParams: { id }
			}
		);
	}

	/**
	 * Reject a pending request.
	 * @param id The unique identifier of the request.
	 * @param reason The reason to give the account.
	 * @returns A promise that resolves when the request has been rejected.
	 */
	public async reject(id: string, reason?: string): Promise<void> {
		Guards.stringValue(OrganizationRequestAdminRestClient.CLASS_NAME, nameof(id), id);

		await this.fetch<IOrganizationRequestRejectRequest, INoContentResponse>(
			"/:id/reject",
			HttpMethod.POST,
			{
				pathParams: { id },
				body: { reason }
			}
		);
	}

	/**
	 * Remove every request of an account, used when the account is removed.
	 * @param accountId The account id.
	 * @returns A promise that resolves when the requests have been removed.
	 */
	public async removeForAccount(accountId: string): Promise<void> {
		Guards.stringValue(OrganizationRequestAdminRestClient.CLASS_NAME, nameof(accountId), accountId);

		await this.fetch<IOrganizationRequestRemoveForAccountRequest, INoContentResponse>(
			"/account/:accountId",
			HttpMethod.DELETE,
			{
				pathParams: { accountId }
			}
		);
	}
}
