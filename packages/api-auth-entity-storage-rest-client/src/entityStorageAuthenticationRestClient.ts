// Copyright 2024 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type {
	IAuthenticationAccountSummary,
	IAuthenticationComponent,
	IAuthenticationRegistration,
	ILoginRequest,
	ILoginResponse,
	ILoginResult,
	ILoginWithProviderRequest,
	ILogoutRequest,
	IMeResponse,
	IPasswordForgotRequest,
	IPasswordPolicyResponse,
	IPasswordOptions,
	IPasswordResetRequest,
	IProvidersResponse,
	IRefreshTokenRequest,
	IRefreshTokenResponse,
	IRegisterAcceptedResponse,
	IRegisterRequest,
	IRegisterVerifyRequest,
	IUpdatePasswordRequest,
	IUpdatePasswordResponse
} from "@3sixty/api-auth-entity-storage-models";
import type { IAuthenticationProviderDetails } from "@3sixty/api-auth-models";
import { BaseRestClient } from "@3sixty/api-core";
import type { INoContentRequest, INoContentResponse } from "@3sixty/api-models";
import { Guards } from "@3sixty/core";
import { nameof } from "@3sixty/nameof";
import { CookieHelper, HeaderTypes } from "@3sixty/web";
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
	 * @returns The token, and the profile when the provider holds one.
	 */
	public async login(email: string, password: string): Promise<ILoginResult> {
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
			accountId: response.body.accountId,
			token: CookieHelper.getCookieFromHeaders(
				response?.headers?.[HeaderTypes.SetCookie],
				this._cookieName
			),
			expiry: response.body.expiry,
			profile: response.body.profile,
			profileReadOnly: response.body.profileReadOnly ?? false,
			profileEditUrl: response.body.profileEditUrl,
			passwordChangeUrl: response.body.passwordChangeUrl,
			roles: response.body.roles
		};
	}

	/**
	 * Perform a login through an authentication provider, creating the account on the first login.
	 * @param authProviderId The authentication provider id.
	 * @param credentials The provider specific credentials.
	 * @returns The token, and the profile when the provider holds one.
	 */
	public async loginWithProvider(
		authProviderId: string,
		credentials: unknown
	): Promise<ILoginResult> {
		Guards.stringValue(
			EntityStorageAuthenticationRestClient.CLASS_NAME,
			nameof(authProviderId),
			authProviderId
		);
		Guards.object<ILoginWithProviderRequest["body"]>(
			EntityStorageAuthenticationRestClient.CLASS_NAME,
			nameof(credentials),
			credentials
		);

		const response = await this.fetch<ILoginWithProviderRequest, ILoginResponse>(
			"/login/:authProviderId",
			"POST",
			{
				pathParams: {
					authProviderId
				},
				body: credentials
			}
		);

		return {
			accountId: response.body.accountId,
			token: CookieHelper.getCookieFromHeaders(
				response?.headers?.[HeaderTypes.SetCookie],
				this._cookieName
			),
			expiry: response.body.expiry,
			profile: response.body.profile,
			profileReadOnly: response.body.profileReadOnly ?? false,
			profileEditUrl: response.body.profileEditUrl,
			passwordChangeUrl: response.body.passwordChangeUrl,
			roles: response.body.roles
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
	 * Update the user's password, ending the other sessions of the account.
	 * @param currentPassword The current password for the user.
	 * @param newPassword The new password for the user.
	 * @returns The new token for the current session.
	 */
	public async updatePassword(
		currentPassword: string,
		newPassword: string
	): Promise<{
		token?: string;
		expiry: number;
	}> {
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

		const response = await this.fetch<IUpdatePasswordRequest, IUpdatePasswordResponse>(
			"/password",
			"PUT",
			{
				body: {
					currentPassword,
					newPassword
				}
			}
		);

		return {
			token:
				response.body.token ??
				CookieHelper.getCookieFromHeaders(
					response?.headers?.[HeaderTypes.SetCookie],
					this._cookieName
				),
			expiry: response.body.expiry
		};
	}

	/**
	 * Send a link to reset a forgotten password to the e-mail address, when a password account uses it.
	 * @param email The e-mail address of the account.
	 * @returns A promise that resolves when the request has been handled.
	 */
	public async forgotPassword(email: string): Promise<void> {
		Guards.stringValue(EntityStorageAuthenticationRestClient.CLASS_NAME, nameof(email), email);

		await this.fetch<IPasswordForgotRequest, INoContentResponse>("/password/forgot", "POST", {
			body: {
				email
			}
		});
	}

	/**
	 * Reset a forgotten password with the token from the reset link.
	 * @param token The token from the reset link.
	 * @param newPassword The new password for the account.
	 * @returns A promise that resolves when the password has been reset.
	 */
	public async resetPassword(token: string, newPassword: string): Promise<void> {
		Guards.stringValue(EntityStorageAuthenticationRestClient.CLASS_NAME, nameof(token), token);
		Guards.stringValue(
			EntityStorageAuthenticationRestClient.CLASS_NAME,
			nameof(newPassword),
			newPassword
		);

		await this.fetch<IPasswordResetRequest, INoContentResponse>("/password/reset", "POST", {
			body: {
				token,
				newPassword
			}
		});
	}

	/**
	 * Remove the signed in account and the data stored for it.
	 * @returns A promise that resolves when the account has been removed.
	 */
	public async removeAccount(): Promise<void> {
		await this.fetch<INoContentRequest, INoContentResponse>("/me", "DELETE");
	}

	/**
	 * Get the password policy used for password validation.
	 * @returns The password policy options.
	 */
	public async passwordPolicy(): Promise<IPasswordOptions> {
		const response = await this.fetch<INoContentRequest, IPasswordPolicyResponse>("/policy", "GET");

		return response.body;
	}

	/**
	 * Get the authentication providers enabled on the server.
	 * @returns The providers and what each supports, in the order they were registered.
	 */
	public async providers(): Promise<IAuthenticationProviderDetails[]> {
		const response = await this.fetch<INoContentRequest, IProvidersResponse>("/providers", "GET");
		return response.body.providers;
	}

	/**
	 * Sign up for a password account. A verification link is sent by e-mail, and the account can
	 * sign in once it has been verified.
	 * @param registration The details of the account.
	 * @returns A promise that resolves when the sign up has been accepted.
	 */
	public async register(registration: IAuthenticationRegistration): Promise<void> {
		Guards.object<IAuthenticationRegistration>(
			EntityStorageAuthenticationRestClient.CLASS_NAME,
			nameof(registration),
			registration
		);

		await this.fetch<IRegisterRequest, IRegisterAcceptedResponse>("/register", "POST", {
			body: registration
		});
	}

	/**
	 * Verify the e-mail address of a sign up with the token from the verification link.
	 * @param token The token from the verification link.
	 * @returns A promise that resolves when the account has been verified.
	 */
	public async verifyRegistration(token: string): Promise<void> {
		Guards.stringValue(EntityStorageAuthenticationRestClient.CLASS_NAME, nameof(token), token);

		await this.fetch<IRegisterVerifyRequest, INoContentResponse>("/register/verify", "POST", {
			body: {
				token
			}
		});
	}

	/**
	 * Get the signed in account.
	 * @returns The account details.
	 */
	public async me(): Promise<IAuthenticationAccountSummary> {
		const response = await this.fetch<INoContentRequest, IMeResponse>("/me", "GET");
		return response.body;
	}
}
