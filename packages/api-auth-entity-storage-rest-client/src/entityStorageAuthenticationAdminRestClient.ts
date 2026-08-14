// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type {
	IAdminUserCreateRequest,
	IAdminUserGetByIdentityRequest,
	IAdminUserGetRequest,
	IAdminUserGetResponse,
	IAdminUserRemoveRequest,
	IAdminUserUpdatePasswordRequest,
	IAdminUserUpdateRequest,
	IAuthenticationAdminComponent,
	IAuthenticationUser
} from "@twin.org/api-auth-entity-storage-models";
import { BaseRestClient } from "@twin.org/api-core";
import type { IBaseRestClientConfig, INoContentResponse } from "@twin.org/api-models";
import { Guards } from "@twin.org/core";
import { nameof } from "@twin.org/nameof";
import { HttpMethod } from "@twin.org/web";

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
	public async create(user: IAuthenticationUser & { password: string }): Promise<void> {
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
	 * Update a login for the user.
	 * @param user The user to update.
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
	 * Get a user by identity.
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
			"GET",
			{
				pathParams: {
					identity
				}
			}
		);

		return response.body;
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
	 * Update the user's password.
	 * @param email The email address of the user to update.
	 * @param newPassword The new password for the user.
	 * @param currentPassword The current password, optional, if supplied will check against existing.
	 * @returns Nothing.
	 */
	public async updatePassword(
		email: string,
		newPassword: string,
		currentPassword?: string
	): Promise<void> {
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
					newPassword,
					currentPassword
				}
			}
		);
	}
}
