// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type {
	IAuthenticationComponent,
	ILoginRequest,
	ILoginResponse,
	ILogoutRequest,
	IRefreshTokenRequest,
	IRefreshTokenResponse,
	IUpdatePasswordRequest
} from "@twin.org/api-auth-entity-storage-models";
import { BaseRestClient } from "@twin.org/api-core";
import type { INoContentResponse } from "@twin.org/api-models";
import { Guards } from "@twin.org/core";
import { nameof } from "@twin.org/nameof";
import { CookieHelper, HeaderTypes } from "@twin.org/web";
import type { IEntityStorageAuthenticationRestClientConstructorOptions } from "./models/entityStorageAuthenticationRestClientConstructorOptions.js";

/**
 * The client to connect to the authentication service.
 */
export class EntityStorageAuthenticationRestClient
	extends BaseRestClient
	implements IAuthenticationComponent
{
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<EntityStorageAuthenticationRestClient>();

	/**
	 * The default name for the access token as a cookie.
	 * @internal
	 */
	public static readonly DEFAULT_COOKIE_NAME: string = "access_token";

	/**
	 * The name of the cookie to use for storing the auth token.
	 * @internal
	 */
	private readonly _cookieName: string;

	/**
	 * Create a new instance of EntityStorageAuthenticationRestClient.
	 * @param config The configuration for the client.
	 */
	constructor(config: IEntityStorageAuthenticationRestClientConstructorOptions) {
		super(nameof<EntityStorageAuthenticationRestClient>(), config, "authentication");
		this._cookieName =
			config.cookieName ?? EntityStorageAuthenticationRestClient.DEFAULT_COOKIE_NAME;
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return EntityStorageAuthenticationRestClient.CLASS_NAME;
	}

	/**
	 * Perform a login for the user.
	 * @param email The email address for the user.
	 * @param password The password for the user.
	 * @returns The authentication token for the user, if it uses a mechanism with public access.
	 */
	public async login(
		email: string,
		password: string
	): Promise<{
		token?: string;
		expiry: number;
	}> {
		Guards.stringValue(EntityStorageAuthenticationRestClient.CLASS_NAME, nameof(email), email);
		Guards.stringValue(
			EntityStorageAuthenticationRestClient.CLASS_NAME,
			nameof(password),
			password
		);

		const response = await this.fetch<ILoginRequest, ILoginResponse>("/login", "POST", {
			body: {
				email,
				password
			}
		});

		return {
			token: CookieHelper.getCookieFromHeaders(
				response?.headers?.[HeaderTypes.SetCookie],
				this._cookieName
			),
			expiry: response.body.expiry
		};
	}

	/**
	 * Logout the current user.
	 * @param token The token to logout, if it uses a mechanism with public access.
	 * @returns A promise that resolves when the logout request has completed.
	 */
	public async logout(token?: string): Promise<void> {
		await this.fetch<ILogoutRequest, INoContentResponse>("/logout", "POST", {
			body: {
				token
			}
		});
	}

	/**
	 * Refresh the token.
	 * @param token The token to refresh, if it uses a mechanism with public access.
	 * @returns The refreshed token, if it uses a mechanism with public access.
	 */
	public async refresh(token?: string): Promise<{
		token?: string;
		expiry: number;
	}> {
		const response = await this.fetch<IRefreshTokenRequest, IRefreshTokenResponse>(
			"/refresh",
			"POST",
			{
				body: {
					token
				}
			}
		);

		return {
			token: CookieHelper.getCookieFromHeaders(
				response?.headers?.[HeaderTypes.SetCookie],
				this._cookieName
			),
			expiry: response.body.expiry
		};
	}

	/**
	 * Update the user's password.
	 * @param currentPassword The current password for the user.
	 * @param newPassword The new password for the user.
	 * @returns A promise that resolves when the password has been updated on the server.
	 */
	public async updatePassword(currentPassword: string, newPassword: string): Promise<void> {
		Guards.stringValue(
			EntityStorageAuthenticationRestClient.CLASS_NAME,
			nameof(currentPassword),
			currentPassword
		);
		Guards.stringValue(
			EntityStorageAuthenticationRestClient.CLASS_NAME,
			nameof(newPassword),
			newPassword
		);

		await this.fetch<IUpdatePasswordRequest, INoContentResponse>("/password", "PUT", {
			body: {
				currentPassword,
				newPassword
			}
		});
	}
}
