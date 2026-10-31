// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type {
	IAccountAdminIdentityCreateRequest,
	IAccountAdminIdentityExportRequest,
	IAccountIdentityAdoptResponse,
	IAccountAdminIdentityImportRequest,
	IAccountAdminProfileExportRequest,
	IAccountAdminProfileImportRequest,
	IAccountIdentityExport,
	IAccountIdentityExportResponse,
	IAccountIdentityImportResponse,
	IAccountIdentityImportResult,
	IAccountProfileExport,
	IAccountProfileExportResponse,
	IAccountProfileImportResponse,
	IAccountProfileImportResult,
	IAccountDataAdminCreateRequest,
	IAccountDataGetRequest,
	IAccountDataGetResponse,
	IAccountDataAdminQueryRequest,
	IAccountDataQueryResponse,
	IAccountDataRemoveRequest,
	IAccountDataUpdateRequest,
	IAuthenticationAccountAdminComponent,
	IAuthenticationAccountData
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
 * The client to connect to the account data administration service, for the data of any account.
 */
export class EntityStorageAuthenticationAccountAdminRestClient
	extends BaseRestClient
	implements IAuthenticationAccountAdminComponent
{
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string =
		nameof<EntityStorageAuthenticationAccountAdminRestClient>();

	/**
	 * Create a new instance of EntityStorageAuthenticationAccountAdminRestClient.
	 * @param config The configuration for the client.
	 */
	constructor(config: IBaseRestClientConfig) {
		super(
			nameof<EntityStorageAuthenticationAccountAdminRestClient>(),
			config,
			"authentication/admin/account"
		);
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return EntityStorageAuthenticationAccountAdminRestClient.CLASS_NAME;
	}

	/**
	 * Store an item for an account.
	 * @param accountId The account to store the item for.
	 * @param type The type of the item.
	 * @param data The value of the item.
	 * @param isDefault True to use the item first for its type, clearing any other default.
	 * @param proof A proof by the DID over the identity proof document, required when a caller
	 * without escalated privilege stores an identity.
	 * @returns The unique identifier of the item.
	 */
	public async create(
		accountId: string,
		type: string,
		data: unknown,
		isDefault?: boolean,
		proof?: IProof
	): Promise<string> {
		Guards.stringValue(
			EntityStorageAuthenticationAccountAdminRestClient.CLASS_NAME,
			nameof(accountId),
			accountId
		);
		Guards.stringValue(
			EntityStorageAuthenticationAccountAdminRestClient.CLASS_NAME,
			nameof(type),
			type
		);
		Guards.defined(
			EntityStorageAuthenticationAccountAdminRestClient.CLASS_NAME,
			nameof(data),
			data
		);

		const response = await this.fetch<IAccountDataAdminCreateRequest, ICreatedResponse>(
			"/",
			HttpMethod.POST,
			{
				body: { accountId, type, data, isDefault, proof }
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
		Guards.stringValue(
			EntityStorageAuthenticationAccountAdminRestClient.CLASS_NAME,
			nameof(id),
			id
		);

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
		Guards.stringValue(
			EntityStorageAuthenticationAccountAdminRestClient.CLASS_NAME,
			nameof(id),
			id
		);
		Guards.defined(
			EntityStorageAuthenticationAccountAdminRestClient.CLASS_NAME,
			nameof(data),
			data
		);

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
		Guards.stringValue(
			EntityStorageAuthenticationAccountAdminRestClient.CLASS_NAME,
			nameof(id),
			id
		);

		await this.fetch<IAccountDataRemoveRequest, INoContentResponse>("/:id", HttpMethod.DELETE, {
			pathParams: { id }
		});
	}

	/**
	 * Create an identity with keys the node holds for an account that has none.
	 * @param accountId The account.
	 * @returns The DID of the account.
	 */
	public async createIdentity(accountId: string): Promise<string> {
		Guards.stringValue(
			EntityStorageAuthenticationAccountAdminRestClient.CLASS_NAME,
			nameof(accountId),
			accountId
		);
		const response = await this.fetch<
			IAccountAdminIdentityCreateRequest,
			IAccountIdentityAdoptResponse
		>("/:accountId/identity", HttpMethod.POST, { pathParams: { accountId } });
		return response.body.identity;
	}

	/**
	 * Export the identity of an account with its private keys and the credentials it holds.
	 * @param accountId The account.
	 * @param sessionStart When the session started, the server reads it from the token of the request.
	 * @returns The export, which contains private keys and must be protected.
	 */
	public async exportIdentity(
		accountId: string,
		sessionStart?: number
	): Promise<IAccountIdentityExport> {
		Guards.stringValue(
			EntityStorageAuthenticationAccountAdminRestClient.CLASS_NAME,
			nameof(accountId),
			accountId
		);
		const response = await this.fetch<
			IAccountAdminIdentityExportRequest,
			IAccountIdentityExportResponse
		>("/:accountId/identity/export", HttpMethod.POST, { pathParams: { accountId } });
		return response.body;
	}

	/**
	 * Import a self-controlled identity into an account that has none.
	 * @param accountId The account.
	 * @param exported The account identity export file.
	 * @returns The DID and what was imported.
	 */
	public async importIdentity(
		accountId: string,
		exported: IAccountIdentityExport
	): Promise<IAccountIdentityImportResult> {
		Guards.stringValue(
			EntityStorageAuthenticationAccountAdminRestClient.CLASS_NAME,
			nameof(accountId),
			accountId
		);
		const response = await this.fetch<
			IAccountAdminIdentityImportRequest,
			IAccountIdentityImportResponse
		>("/:accountId/identity/import", HttpMethod.POST, {
			pathParams: { accountId },
			body: exported
		});
		return response.body;
	}

	/**
	 * Export the account data of an account.
	 * @param accountId The account.
	 * @returns The export.
	 */
	public async exportProfile(accountId: string): Promise<IAccountProfileExport> {
		Guards.stringValue(
			EntityStorageAuthenticationAccountAdminRestClient.CLASS_NAME,
			nameof(accountId),
			accountId
		);
		const response = await this.fetch<
			IAccountAdminProfileExportRequest,
			IAccountProfileExportResponse
		>("/:accountId/export", HttpMethod.GET, { pathParams: { accountId } });
		return response.body;
	}

	/**
	 * Replace the account data of an account with an export.
	 * @param accountId The account.
	 * @param profile The account profile export file.
	 * @returns What was imported and removed.
	 */
	public async importProfile(
		accountId: string,
		profile: IAccountProfileExport
	): Promise<IAccountProfileImportResult> {
		Guards.stringValue(
			EntityStorageAuthenticationAccountAdminRestClient.CLASS_NAME,
			nameof(accountId),
			accountId
		);
		const response = await this.fetch<
			IAccountAdminProfileImportRequest,
			IAccountProfileImportResponse
		>("/:accountId/import", HttpMethod.POST, {
			pathParams: { accountId },
			body: profile
		});
		return response.body;
	}

	/**
	 * Query the items of any account.
	 * @param accountId The account of the items to return, all accounts when omitted.
	 * @param type The type of the items to return, all types when omitted.
	 * @param cursor The cursor to request the next page.
	 * @param limit The maximum number of items to return.
	 * @returns The items and a cursor when there are more.
	 */
	public async query(
		accountId?: string,
		type?: string,
		cursor?: string,
		limit?: number
	): Promise<{
		entities: IAuthenticationAccountData[];
		cursor?: string;
	}> {
		const response = await this.fetch<IAccountDataAdminQueryRequest, IAccountDataQueryResponse>(
			"/",
			HttpMethod.GET,
			{
				query: {
					accountId,
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
