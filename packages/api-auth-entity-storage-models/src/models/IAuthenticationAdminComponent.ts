// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IComponent } from "@3sixty/core";
import type { IAuthenticationUser } from "./IAuthenticationUser.js";

/**
 * Contract definition for authentication admin component.
 */
export interface IAuthenticationAdminComponent extends IComponent {
	/**
	 * Create a login for the user.
	 * @param user The user to create.
	 * @returns A promise that resolves when the user account has been created.
	 */
	create(user: IAuthenticationUser & { password: string }): Promise<void>;

	/**
	 * Update a login for the user.
	 * @param user The user to update.
	 * @returns A promise that resolves when the user account has been updated.
	 */
	update(user: Partial<IAuthenticationUser>): Promise<void>;

	/**
	 * Get a user by email.
	 * @param email The email address of the user to get.
	 * @returns The user details.
	 */
	get(email: string): Promise<IAuthenticationUser>;

	/**
	 * Get a user by identity.
	 * @param identity The identity of the user to get.
	 * @returns The user details.
	 */
	getByIdentity(identity: string): Promise<IAuthenticationUser>;

	/**
	 * Remove a user.
	 * @param email The email address of the user to remove.
	 * @returns A promise that resolves when the user account has been removed.
	 */
	remove(email: string): Promise<void>;

	/**
	 * Update the user's password.
	 * @param email The email address of the user to update.
	 * @param newPassword The new password for the user.
	 * @param currentPassword The current password, optional, if supplied will check against existing.
	 * @returns A promise that resolves when the password has been updated.
	 */
	updatePassword(email: string, newPassword: string, currentPassword?: string): Promise<void>;
}
