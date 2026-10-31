// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type {
	IAccountDataCreateRequest,
	IAccountDataGetRequest,
	IAccountDataGetResponse,
	IAccountDataQueryRequest,
	IAccountDataQueryResponse,
	IAccountDataRemoveRequest,
	IAccountDataUpdateRequest,
	IAccountIdentityAdoptRequest,
	IAccountIdentityAdoptResponse,
	IAccountIdentityExport,
	IAccountIdentityExportResponse,
	IAccountIdentityImportRequest,
	IAccountIdentityImportResponse,
	IAccountIdentityImportResult,
	IAccountOrganizationGetResponse,
	IAccountOrganizationJoinRequest,
	IAccountOrganizationLeaveRequest,
	IAccountOrganizationRequestGetResponse,
	IAccountProfileExport,
	IAccountProfileExportResponse,
	IAccountProfileImportRequest,
	IAccountProfileImportResponse,
	IAccountProfileImportResult,
	IAuthenticationAccountComponent,
	IAuthenticationAccountData,
	IOrganizationRequest
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
import type { IProof } from "@3sixty/standards-w3c-did";
import { HttpMethod } from "@3sixty/web";

/**
 * The client to connect to the account data service, for the data of the signed in account.
 */
export class EntityStorageAuthenticationAccountRestClient
	extends BaseRestClient
	implements IAuthenticationAccountComponent
{
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string =
		nameof<EntityStorageAuthenticationAccountRestClient>();

	/**
	 * Create a new instance of EntityStorageAuthenticationAccountRestClient.
	 * @param config The configuration for the client.
	 */
	constructor(config: IBaseRestClientConfig) {
		super(nameof<EntityStorageAuthenticationAccountRestClient>(), config, "authentication/account");
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return EntityStorageAuthenticationAccountRestClient.CLASS_NAME;
	}

	/**
	 * Adopt an identity for the signed in account, an account has only one.
	 * @param identity The DID to adopt, a new self-controlled DID is created when omitted.
	 * @param proof A proof by the DID over the identity proof document, required with the identity.
	 * @param sessionStart When the session started, the server reads it from the token of the request.
	 * @returns The DID of the account.
	 */
	public async adoptIdentity(
		identity?: string,
		proof?: IProof,
		sessionStart?: number
	): Promise<string> {
		const response = await this.fetch<IAccountIdentityAdoptRequest, IAccountIdentityAdoptResponse>(
			"/identity",
			HttpMethod.POST,
			{
				body: { identity, proof }
			}
		);

		return response.body.identity;
	}

	/**
	 * Export the identity of the signed in account with its private keys and credentials.
	 * @param sessionStart When the session started, the server reads it from the token of the request.
	 * @returns The export, which contains private keys and must be protected.
	 */
	public async exportIdentity(sessionStart?: number): Promise<IAccountIdentityExport> {
		const response = await this.fetch<never, IAccountIdentityExportResponse>(
			"/identity/export",
			HttpMethod.POST
		);

		return response.body;
	}

	/**
	 * Import a self-controlled identity into the signed in account, instead of adopting one.
	 * @param exported The export of the identity and its credentials.
	 * @param sessionStart When the session started, the server reads it from the token of the request.
	 * @returns The DID and what was imported.
	 */
	public async importIdentity(
		exported: IAccountIdentityExport,
		sessionStart?: number
	): Promise<IAccountIdentityImportResult> {
		// A guard error only carries a value that is not an object, so never the keys of an export.
		Guards.object<IAccountIdentityExport>(
			EntityStorageAuthenticationAccountRestClient.CLASS_NAME,
			nameof(exported),
			exported
		);

		const response = await this.fetch<
			IAccountIdentityImportRequest,
			IAccountIdentityImportResponse
		>("/identity/import", HttpMethod.POST, {
			body: exported
		});

		return response.body;
	}

	/**
	 * Remove the identity of the signed in account with its credentials and organizations.
	 * @param sessionStart When the session started, the server reads it from the token of the request.
	 * @returns A promise that resolves when the identity has been removed.
	 */
	public async removeIdentity(sessionStart?: number): Promise<void> {
		await this.fetch<never, INoContentResponse>("/identity", HttpMethod.DELETE);
	}

	/**
	 * Leave an organization with the signed in account.
	 * @param organization The DID of the organization.
	 * @returns A promise that resolves when the account has left.
	 */
	public async leaveOrganization(organization: string): Promise<void> {
		Guards.stringValue(
			EntityStorageAuthenticationAccountRestClient.CLASS_NAME,
			nameof(organization),
			organization
		);

		await this.fetch<IAccountOrganizationLeaveRequest, INoContentResponse>(
			"/organization/:organization",
			HttpMethod.DELETE,
			{
				pathParams: { organization }
			}
		);
	}

	/**
	 * Export the account data of the signed in account, other than its identity, organizations and
	 * credentials.
	 * @returns The export.
	 */
	public async exportProfile(): Promise<IAccountProfileExport> {
		const response = await this.fetch<never, IAccountProfileExportResponse>(
			"/export",
			HttpMethod.GET
		);

		return response.body;
	}

	/**
	 * Replace the account data of the signed in account with an export.
	 * @param profile The export.
	 * @returns What was imported and removed.
	 */
	public async importProfile(profile: IAccountProfileExport): Promise<IAccountProfileImportResult> {
		Guards.object<IAccountProfileExport>(
			EntityStorageAuthenticationAccountRestClient.CLASS_NAME,
			nameof(profile),
			profile
		);

		const response = await this.fetch<IAccountProfileImportRequest, IAccountProfileImportResponse>(
			"/import",
			HttpMethod.POST,
			{
				body: profile
			}
		);

		return response.body;
	}

	/**
	 * Ask to join an organization with the signed in account, an admin accepts or rejects the request.
	 * @param organization The DID of the organization to join.
	 * @returns A promise that resolves when the request has been made.
	 */
	public async joinOrganization(organization: string): Promise<void> {
		Guards.stringValue(
			EntityStorageAuthenticationAccountRestClient.CLASS_NAME,
			nameof(organization),
			organization
		);

		await this.fetch<IAccountOrganizationJoinRequest, INoContentResponse>(
			"/organization",
			HttpMethod.POST,
			{
				body: { organization }
			}
		);
	}

	/**
	 * Get the organization of the signed in account.
	 * @returns The DID of the organization, or undefined while there is none or a request is pending.
	 */
	public async getOrganization(): Promise<string | undefined> {
		const response = await this.fetch<never, IAccountOrganizationGetResponse>(
			"/organization",
			HttpMethod.GET
		);

		return response.body.organization;
	}

	/**
	 * Cancel the pending request of the signed in account to join an organization.
	 * @returns A promise that resolves when the request has been cancelled.
	 */
	public async cancelOrganizationRequest(): Promise<void> {
		await this.fetch<never, INoContentResponse>("/organization/request", HttpMethod.DELETE);
	}

	/**
	 * Get the request of the signed in account to join an organization, so its status can be shown.
	 * @returns The pending request, otherwise the latest request, or undefined when none was made.
	 */
	public async getOrganizationRequest(): Promise<IOrganizationRequest | undefined> {
		const response = await this.fetch<never, IAccountOrganizationRequestGetResponse>(
			"/organization/request",
			HttpMethod.GET
		);

		return response.body.request;
	}

	/**
	 * Store an item for the signed in account.
	 * @param type The type of the item.
	 * @param data The value of the item.
	 * @param isDefault True to use the item first for its type, clearing any other default.
	 * @returns The unique identifier of the item.
	 */
	public async create(type: string, data: unknown, isDefault?: boolean): Promise<string> {
		Guards.stringValue(EntityStorageAuthenticationAccountRestClient.CLASS_NAME, nameof(type), type);
		Guards.defined(EntityStorageAuthenticationAccountRestClient.CLASS_NAME, nameof(data), data);

		const response = await this.fetch<IAccountDataCreateRequest, ICreatedResponse>(
			"/",
			HttpMethod.POST,
			{
				body: { type, data, isDefault }
			}
		);

		return HttpHeaderHelper.extractId(response.headers, `${this.getPathPrefix()}/:id`);
	}

	/**
	 * Get an item.
	 * @param id The unique identifier of the item.
	 * @returns The item.
	 */
	public async get(id: string): Promise<IAuthenticationAccountData> {
		Guards.stringValue(EntityStorageAuthenticationAccountRestClient.CLASS_NAME, nameof(id), id);

		const response = await this.fetch<IAccountDataGetRequest, IAccountDataGetResponse>(
			"/:id",
			HttpMethod.GET,
			{
				pathParams: { id }
			}
		);

		return response.body;
	}

	/**
	 * Replace the value of an item.
	 * @param id The unique identifier of the item.
	 * @param data The new value of the item.
	 * @param isDefault True to use the item first for its type, clearing any other default, unchanged when omitted.
	 * @returns A promise that resolves when the item has been updated.
	 */
	public async update(id: string, data: unknown, isDefault?: boolean): Promise<void> {
		Guards.stringValue(EntityStorageAuthenticationAccountRestClient.CLASS_NAME, nameof(id), id);
		Guards.defined(EntityStorageAuthenticationAccountRestClient.CLASS_NAME, nameof(data), data);

		await this.fetch<IAccountDataUpdateRequest, INoContentResponse>("/:id", HttpMethod.PUT, {
			pathParams: { id },
			body: { data, isDefault }
		});
	}

	/**
	 * Remove an item.
	 * @param id The unique identifier of the item.
	 * @returns A promise that resolves when the item has been removed.
	 */
	public async remove(id: string): Promise<void> {
		Guards.stringValue(EntityStorageAuthenticationAccountRestClient.CLASS_NAME, nameof(id), id);

		await this.fetch<IAccountDataRemoveRequest, INoContentResponse>("/:id", HttpMethod.DELETE, {
			pathParams: { id }
		});
	}

	/**
	 * Query the items of the signed in account.
	 * @param type The type of the items to return, all types when omitted.
	 * @param cursor The cursor to request the next page.
	 * @param limit The maximum number of items to return.
	 * @returns The items and a cursor when there are more.
	 */
	public async query(
		type?: string,
		cursor?: string,
		limit?: number
	): Promise<{
		entities: IAuthenticationAccountData[];
		cursor?: string;
	}> {
		const response = await this.fetch<IAccountDataQueryRequest, IAccountDataQueryResponse>(
			"/",
			HttpMethod.GET,
			{
				query: {
					type,
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
}
