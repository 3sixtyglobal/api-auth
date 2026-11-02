// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type {
	IOrganization,
	IOrganizationAdminAddRequest,
	IOrganizationAdminRemoveRequest,
	IOrganizationComponent,
	IOrganizationCreate,
	IOrganizationCreateRequest,
	IOrganizationGetRequest,
	IOrganizationGetResponse,
	IOrganizationIdentityExport,
	IOrganizationIdentityExportRequest,
	IOrganizationIdentityExportResponse,
	IOrganizationMember,
	IOrganizationMemberQueryRequest,
	IOrganizationMemberQueryResponse,
	IOrganizationProfileUpdate,
	IOrganizationQueryRequest,
	IOrganizationQueryResponse,
	IOrganizationRemoveRequest,
	IOrganizationSearchRequest,
	IOrganizationSearchResponse,
	IOrganizationUpdateRequest
} from "@3sixty/api-auth-models";
import { BaseRestClient } from "@3sixty/api-core";
import {
	HttpHeaderHelper,
	type IBaseRestClientConfig,
	type ICreatedResponse,
	type INoContentResponse
} from "@3sixty/api-models";
import { Coerce, Guards } from "@3sixty/core";
import { nameof } from "@3sixty/nameof";
import { HttpMethod } from "@3sixty/web";

/**
 * The client to connect to the service that manages the organizations registered on the node.
 */
export class OrganizationRestClient extends BaseRestClient implements IOrganizationComponent {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<OrganizationRestClient>();

	/**
	 * Create a new instance of OrganizationRestClient.
	 * @param config The configuration for the client.
	 */
	constructor(config: IBaseRestClientConfig) {
		super(nameof<OrganizationRestClient>(), config, "authentication/organization");
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return OrganizationRestClient.CLASS_NAME;
	}

	/**
	 * Create an organization.
	 * @param organization The details of the organization.
	 * @returns The organization.
	 */
	public async create(organization: IOrganizationCreate): Promise<IOrganization> {
		Guards.object<IOrganizationCreate>(
			OrganizationRestClient.CLASS_NAME,
			nameof(organization),
			organization
		);

		const response = await this.fetch<IOrganizationCreateRequest, ICreatedResponse>(
			"/",
			HttpMethod.POST,
			{
				body: organization
			}
		);

		return this.get(HttpHeaderHelper.extractId(response.headers, `${this.getPathPrefix()}/:id`));
	}

	/**
	 * Get an organization.
	 * @param id The unique identifier or the DID of the organization.
	 * @returns The organization.
	 */
	public async get(id: string): Promise<IOrganization> {
		Guards.stringValue(OrganizationRestClient.CLASS_NAME, nameof(id), id);

		const response = await this.fetch<IOrganizationGetRequest, IOrganizationGetResponse>(
			"/:id",
			HttpMethod.GET,
			{
				pathParams: { id }
			}
		);

		return response.body;
	}

	/**
	 * Query the organizations, the earliest first.
	 * @param cursor The cursor to request the next page.
	 * @param limit The maximum number of organizations to return.
	 * @returns The organizations and a cursor when there are more.
	 */
	public async query(
		cursor?: string,
		limit?: number
	): Promise<{
		entities: IOrganization[];
		cursor?: string;
	}> {
		const response = await this.fetch<IOrganizationQueryRequest, IOrganizationQueryResponse>(
			"/",
			HttpMethod.GET,
			{
				query: {
					cursor,
					limit: Coerce.string(limit)
				}
			}
		);

		return {
			entities: response.body.entities,
			cursor: response.body.cursor
		};
	}

	/**
	 * Search the organizations whose name starts with the text given, without case.
	 * @param name The start of the name.
	 * @param limit The maximum number of organizations to return.
	 * @returns The organizations with their names and the public properties of their profiles.
	 */
	public async search(
		name: string,
		limit?: number
	): Promise<{
		entities: IOrganization[];
	}> {
		Guards.stringValue(OrganizationRestClient.CLASS_NAME, nameof(name), name);

		const response = await this.fetch<IOrganizationSearchRequest, IOrganizationSearchResponse>(
			"/search",
			HttpMethod.GET,
			{
				query: {
					name,
					limit: Coerce.string(limit)
				}
			}
		);

		return {
			entities: response.body.entities
		};
	}

	/**
	 * Change the profile, logo and public data of an organization, those omitted are unchanged.
	 * @param id The unique identifier or the DID of the organization.
	 * @param changes The profile, logo and public data.
	 * @returns A promise that resolves when the organization has been changed.
	 */
	public async update(id: string, changes: IOrganizationProfileUpdate): Promise<void> {
		Guards.stringValue(OrganizationRestClient.CLASS_NAME, nameof(id), id);
		Guards.object<IOrganizationProfileUpdate>(
			OrganizationRestClient.CLASS_NAME,
			nameof(changes),
			changes
		);

		await this.fetch<IOrganizationUpdateRequest, INoContentResponse>("/:id", HttpMethod.PUT, {
			pathParams: { id },
			body: changes
		});
	}

	/**
	 * Query the members of an organization.
	 * @param id The unique identifier or the DID of the organization.
	 * @param cursor The cursor to request the next page.
	 * @param limit The maximum number of members to return.
	 * @returns The members and a cursor when there are more.
	 */
	public async queryMembers(
		id: string,
		cursor?: string,
		limit?: number
	): Promise<{
		entities: IOrganizationMember[];
		cursor?: string;
	}> {
		Guards.stringValue(OrganizationRestClient.CLASS_NAME, nameof(id), id);

		const response = await this.fetch<
			IOrganizationMemberQueryRequest,
			IOrganizationMemberQueryResponse
		>("/:id/member", HttpMethod.GET, {
			pathParams: { id },
			query: {
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
	 * Make a member an org admin of an organization.
	 * @param id The unique identifier or the DID of the organization.
	 * @param accountId The account of the member.
	 * @returns A promise that resolves when the member is an org admin.
	 */
	public async addAdmin(id: string, accountId: string): Promise<void> {
		Guards.stringValue(OrganizationRestClient.CLASS_NAME, nameof(id), id);
		Guards.stringValue(OrganizationRestClient.CLASS_NAME, nameof(accountId), accountId);

		await this.fetch<IOrganizationAdminAddRequest, INoContentResponse>(
			"/:id/admin/:accountId",
			HttpMethod.PUT,
			{
				pathParams: { id, accountId }
			}
		);
	}

	/**
	 * Stop a member being an org admin of an organization.
	 * @param id The unique identifier or the DID of the organization.
	 * @param accountId The account of the member.
	 * @returns A promise that resolves when the member is no longer an org admin.
	 */
	public async removeAdmin(id: string, accountId: string): Promise<void> {
		Guards.stringValue(OrganizationRestClient.CLASS_NAME, nameof(id), id);
		Guards.stringValue(OrganizationRestClient.CLASS_NAME, nameof(accountId), accountId);

		await this.fetch<IOrganizationAdminRemoveRequest, INoContentResponse>(
			"/:id/admin/:accountId",
			HttpMethod.DELETE,
			{
				pathParams: { id, accountId }
			}
		);
	}

	/**
	 * Export the identity of an organization with its private keys.
	 * @param id The unique identifier or the DID of the organization.
	 * @param sessionStart When the session started, the server reads it from the token of the request.
	 * @returns The export with the revocation index the organization reached, which contains private
	 * keys and must be protected.
	 */
	public async exportIdentity(
		id: string,
		sessionStart?: number
	): Promise<IOrganizationIdentityExport> {
		Guards.stringValue(OrganizationRestClient.CLASS_NAME, nameof(id), id);

		const response = await this.fetch<
			IOrganizationIdentityExportRequest,
			IOrganizationIdentityExportResponse
		>("/:id/export", HttpMethod.POST, {
			pathParams: { id }
		});

		return response.body;
	}

	/**
	 * Remove an organization that has no members, or of which the calling org admin is the only member.
	 * @param id The unique identifier or the DID of the organization.
	 * @returns A promise that resolves when the organization has been removed.
	 */
	public async remove(id: string): Promise<void> {
		Guards.stringValue(OrganizationRestClient.CLASS_NAME, nameof(id), id);

		await this.fetch<IOrganizationRemoveRequest, INoContentResponse>("/:id", HttpMethod.DELETE, {
			pathParams: { id }
		});
	}
}
