// Copyright 2024 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type {
	IAdminUserCreateRequest,
	IAdminUserDisableRequest,
	IAdminUserEnableRequest,
	IAdminUserGetByIdentityRequest,
	IAdminUserGetRequest,
	IAdminUserGetResponse,
	IAdminUserQueryRequest,
	IAdminUserQueryResponse,
	IAdminUserRemoveRequest,
	IAdminUserUpdatePasswordRequest,
	IAdminUserUpdateRequest,
	IAuthenticationAdminComponent,
	IAuthenticationUser,
	IAuthenticationUserCreate
} from "@3sixty/api-auth-entity-storage-models";
import { BaseRestClient } from "@3sixty/api-core";
import type { IBaseRestClientConfig, INoContentResponse } from "@3sixty/api-models";
import { Guards, Is } from "@3sixty/core";
import { nameof } from "@3sixty/nameof";
import { HttpMethod } from "@3sixty/web";

/**
 * The client to connect to the authentication admin service.
 */
export class EntityStorageAuthenticationAdminRestClient
	extends BaseRestClient
	implements IAuthenticationAdminComponent
{
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<EntityStorageAuthenticationAdminRestClient>();

	/**
	 * Create a new instance of EntityStorageAuthenticationAdminRestClient.
	 * @param config The configuration for the client.
	 */
	constructor(config: IBaseRestClientConfig) {
		super(nameof<EntityStorageAuthenticationAdminRestClient>(), config, "authentication/admin");
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return EntityStorageAuthenticationAdminRestClient.CLASS_NAME;
	}

	/**
	 * Create a login for the user.
	 * @param user The user to create.
	 * @returns Nothing.
	 */
	public async create(user: IAuthenticationUserCreate): Promise<void> {
		Guards.object(EntityStorageAuthenticationAdminRestClient.CLASS_NAME, nameof(user), user);
		Guards.stringValue(
			EntityStorageAuthenticationAdminRestClient.CLASS_NAME,
			nameof(user.email),
			user.email
		);

		await this.fetch<IAdminUserCreateRequest, INoContentResponse>("/users", HttpMethod.POST, {
			body: user
		});
	}

	/**
	 * Get a user by email.
	 * @param email The email address of the user to get.
	 * @returns The user details.
	 */
	public async get(email: string): Promise<IAuthenticationUser> {
		Guards.stringValue(EntityStorageAuthenticationAdminRestClient.CLASS_NAME, nameof(email), email);

		const response = await this.fetch<IAdminUserGetRequest, IAdminUserGetResponse>(
			"/users/:email",
			HttpMethod.GET,
			{
				pathParams: {
					email
				}
			}
		);

		return response.body;
	}

	/**
	 * Get the user whose identity is the DID.
	 * @param identity The identity of the user to get.
	 * @returns The user details.
	 */
	public async getByIdentity(identity: string): Promise<IAuthenticationUser> {
		Guards.stringValue(
			EntityStorageAuthenticationAdminRestClient.CLASS_NAME,
			nameof(identity),
			identity
		);

		const response = await this.fetch<IAdminUserGetByIdentityRequest, IAdminUserGetResponse>(
			"/users/identity/:identity",
			HttpMethod.GET,
			{
				pathParams: {
					identity
				}
			}
		);

		return response.body;
	}

	/**
	 * Update the identity or organization of a user.
	 * @param user The user to update, found by email address or account id.
	 * @returns Nothing.
	 */
	public async update(user: Partial<IAuthenticationUser>): Promise<void> {
		Guards.object(EntityStorageAuthenticationAdminRestClient.CLASS_NAME, nameof(user), user);
		Guards.stringValue(
			EntityStorageAuthenticationAdminRestClient.CLASS_NAME,
			nameof(user.email),
			user.email
		);

		await this.fetch<IAdminUserUpdateRequest, INoContentResponse>("/users/:email", HttpMethod.PUT, {
			pathParams: {
				email: user.email
			},
			body: {
				userIdentity: user.userIdentity,
				organizationIdentity: user.organizationIdentity
			}
		});
	}

	/**
	 * Remove a user.
	 * @param email The email address of the user to remove.
	 * @returns Nothing.
	 */
	public async remove(email: string): Promise<void> {
		Guards.stringValue(EntityStorageAuthenticationAdminRestClient.CLASS_NAME, nameof(email), email);

		await this.fetch<IAdminUserRemoveRequest, INoContentResponse>(
			"/users/:email",
			HttpMethod.DELETE,
			{
				pathParams: {
					email
				}
			}
		);
	}

	/**
	 * Set the user's password as an override, without its current password.
	 * @param email The email address of the user to update.
	 * @param newPassword The new password for the user.
	 * @returns Nothing.
	 */
	public async updatePassword(email: string, newPassword: string): Promise<void> {
		Guards.stringValue(EntityStorageAuthenticationAdminRestClient.CLASS_NAME, nameof(email), email);
		Guards.stringValue(
			EntityStorageAuthenticationAdminRestClient.CLASS_NAME,
			nameof(newPassword),
			newPassword
		);

		await this.fetch<IAdminUserUpdatePasswordRequest, INoContentResponse>(
			"/users/:email/password",
			HttpMethod.PUT,
			{
				pathParams: {
					email
				},
				body: {
					newPassword
				}
			}
		);
	}

	/**
	 * Query the users.
	 * @param email The start of the e-mail address of the users to return, all when omitted.
	 * @param exactEmail True to match the e-mail address exactly rather than as a prefix.
	 * @param authProviderId The authentication provider of the users to return, all when omitted.
	 * @param cursor The cursor to request the next page.
	 * @param limit The maximum number of users to return.
	 * @returns The users and a cursor when there are more.
	 */
	public async query(
		email?: string,
		exactEmail?: boolean,
		authProviderId?: string,
		cursor?: string,
		limit?: number
	): Promise<{
		entities: IAuthenticationUser[];
		cursor?: string;
	}> {
		const response = await this.fetch<IAdminUserQueryRequest, IAdminUserQueryResponse>(
			"/users",
			HttpMethod.GET,
			{
				query: {
					email,
					exactEmail: Is.boolean(exactEmail) ? String(exactEmail) : undefined,
					authProviderId,
					cursor,
					limit: Is.number(limit) ? String(limit) : undefined
				}
			}
		);

		return response.body;
	}

	/**
	 * Disable a user so it cannot sign in.
	 * @param email The email address of the user to disable, or the account id.
	 * @returns Nothing.
	 */
	public async disable(email: string): Promise<void> {
		Guards.stringValue(EntityStorageAuthenticationAdminRestClient.CLASS_NAME, nameof(email), email);

		await this.fetch<IAdminUserDisableRequest, INoContentResponse>(
			"/users/:email/disable",
			HttpMethod.POST,
			{
				pathParams: {
					email
				}
			}
		);
	}

	/**
	 * Enable a disabled user.
	 * @param email The email address of the user to enable, or the account id.
	 * @returns Nothing.
	 */
	public async enable(email: string): Promise<void> {
		Guards.stringValue(EntityStorageAuthenticationAdminRestClient.CLASS_NAME, nameof(email), email);

		await this.fetch<IAdminUserEnableRequest, INoContentResponse>(
			"/users/:email/enable",
			HttpMethod.POST,
			{
				pathParams: {
					email
				}
			}
		);
	}
}
