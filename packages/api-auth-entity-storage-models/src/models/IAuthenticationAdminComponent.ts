// Copyright 2024 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IComponent } from "@3sixty/core";
import type { IAuthenticationUser } from "./IAuthenticationUser.js";
import type { IAuthenticationUserCreate } from "./IAuthenticationUserCreate.js";

/**
 * Contract definition for authentication admin component.
 */
export interface IAuthenticationAdminComponent extends IComponent {
	/**
	 * Create a login for the user.
	 * @param user The user to create.
	 * @returns A promise that resolves when the user account has been created.
	 */
	create(user: IAuthenticationUserCreate): Promise<void>;

	/**
	 * Get a user of any authentication provider.
	 * @param email The email address of the user to get, or the account id.
	 * @returns The user details.
	 */
	get(email: string): Promise<IAuthenticationUser>;

	/**
	 * Get the user whose identity is the DID.
	 * @param identity The identity of the user to get.
	 * @returns The user details.
	 */
	getByIdentity(identity: string): Promise<IAuthenticationUser>;

	/**
	 * Update the identity or organization of a user.
	 * @param user The user to update, found by email address or account id.
	 * @returns A promise that resolves when the user account has been updated.
	 */
	update(user: Partial<IAuthenticationUser>): Promise<void>;

	/**
	 * Remove a user of any authentication provider.
	 * @param email The email address of the user to remove, or the account id.
	 * @returns A promise that resolves when the user account has been removed.
	 */
	remove(email: string): Promise<void>;

	/**
	 * Set the user's password as an override, without its current password. The caller's own
	 * password is changed through the authentication component instead.
	 * @param email The email address of the user to update, or the account id.
	 * @param newPassword The new password for the user.
	 * @returns A promise that resolves when the password has been updated.
	 */
	updatePassword(email: string, newPassword: string): Promise<void>;

	/**
	 * Query the users, callers without escalated privilege only see the users of their organization.
	 * @param email The start of the e-mail address of the users to return, all when omitted.
	 * @param exactEmail True to match the e-mail address exactly rather than as a prefix.
	 * @param authProviderId The authentication provider of the users to return, all when omitted.
	 * @param cursor The cursor to request the next page.
	 * @param limit The maximum number of users to return.
	 * @returns The users and a cursor when there are more.
	 */
	query(
		email?: string,
		exactEmail?: boolean,
		authProviderId?: string,
		cursor?: string,
		limit?: number
	): Promise<{
		entities: IAuthenticationUser[];
		cursor?: string;
	}>;

	/**
	 * Disable a user so it cannot sign in, ending its sessions.
	 * @param email The email address of the user to disable, or the account id.
	 * @returns A promise that resolves when the user has been disabled.
	 */
	disable(email: string): Promise<void>;

	/**
	 * Enable a disabled user.
	 * @param email The email address of the user to enable, or the account id.
	 * @returns A promise that resolves when the user has been enabled.
	 */
	enable(email: string): Promise<void>;
}
