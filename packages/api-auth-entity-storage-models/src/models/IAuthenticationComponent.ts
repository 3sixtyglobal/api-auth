// Copyright 2024 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuthenticationProviderDetails } from "@3sixty/api-auth-models";
import type { IComponent } from "@3sixty/core";
import type { IAuthenticationAccountSummary } from "./IAuthenticationAccountSummary.js";
import type { IAuthenticationRegistration } from "./IAuthenticationRegistration.js";
import type { ILoginResult } from "./ILoginResult.js";
import type { IPasswordOptions } from "./IPasswordOptions.js";

/**
 * Contract definition for authentication component.
 */
export interface IAuthenticationComponent extends IComponent {
	/**
	 * Perform a login for the user.
	 * @param email The email address for the user.
	 * @param password The password for the user.
	 * @returns The token, and the profile when the provider holds one.
	 */
	login(email: string, password: string): Promise<ILoginResult>;

	/**
	 * Perform a login through an authentication provider, creating the account on the first login.
	 * @param authProviderId The authentication provider id, as registered with the authentication provider factory.
	 * @param credentials The provider specific credentials.
	 * @returns The token, and the profile when the provider holds one.
	 */
	loginWithProvider(authProviderId: string, credentials: unknown): Promise<ILoginResult>;

	/**
	 * Sign up for a password account, when the password authentication provider is registered. A
	 * verification link is sent by e-mail, and the account can sign in once it has been verified.
	 * @param registration The details of the account.
	 * @returns A promise that resolves when the sign up has been accepted.
	 */
	register(registration: IAuthenticationRegistration): Promise<void>;

	/**
	 * Verify the e-mail address of a self sign up with the token from the verification link.
	 * @param token The token from the verification link.
	 * @returns A promise that resolves when the account has been verified.
	 */
	verifyRegistration(token: string): Promise<void>;

	/**
	 * Get the signed in account.
	 * @returns The account details.
	 */
	me(): Promise<IAuthenticationAccountSummary>;

	/**
	 * Logout the current user.
	 * @param token The token to logout, if it uses a mechanism with public access.
	 * @returns A promise that resolves when the logout has been completed.
	 */
	logout(token?: string): Promise<void>;

	/**
	 * Refresh the token.
	 * @param token The token to refresh, if it uses a mechanism with public access.
	 * @returns The refreshed token, if it uses a mechanism with public access.
	 */
	refresh(token?: string): Promise<{
		token?: string;
		expiry: number;
	}>;

	/**
	 * Update the user's password, ending the other sessions of the account. The current session
	 * continues with a new token that keeps its session start.
	 * @param currentPassword The current password for the user.
	 * @param newPassword The new password for the user.
	 * @param token The token of the current session, if it uses a mechanism with public access.
	 * @param sessionStart When the current session started in seconds, read from the token when omitted.
	 * @returns The new token for the current session, if it uses a mechanism with public access.
	 */
	updatePassword(
		currentPassword: string,
		newPassword: string,
		token?: string,
		sessionStart?: number
	): Promise<{
		token?: string;
		expiry: number;
	}>;

	/**
	 * Send a link to reset a forgotten password to the e-mail address, when a password account uses it.
	 * Completes the same way whether or not the account exists.
	 * @param email The e-mail address of the account.
	 * @returns A promise that resolves when the request has been handled.
	 */
	forgotPassword(email: string): Promise<void>;

	/**
	 * Reset a forgotten password with the token from the reset link, ending every session of the account.
	 * @param token The token from the reset link.
	 * @param newPassword The new password for the account.
	 * @returns A promise that resolves when the password has been reset.
	 */
	resetPassword(token: string, newPassword: string): Promise<void>;

	/**
	 * Remove the signed in account and the data stored for it, with its identity and the keys the
	 * node holds for it, the session must have started recently.
	 * @param sessionStart When the current session started in seconds.
	 * @returns A promise that resolves when the account has been removed.
	 */
	removeAccount(sessionStart?: number): Promise<void>;

	/**
	 * Get the password policy used for password validation.
	 * @returns The password policy options.
	 */
	passwordPolicy(): Promise<IPasswordOptions>;

	/**
	 * Get the authentication providers enabled on the server.
	 * @returns The providers and what each supports, in the order they were registered.
	 */
	providers(): Promise<IAuthenticationProviderDetails[]>;
}
