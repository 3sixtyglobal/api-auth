// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IPasswordOptions } from "@twin.org/api-auth-entity-storage-models";
import type { IAuthenticationAuditComponent } from "@twin.org/api-auth-models";
import { AuthAuditEvent } from "@twin.org/api-auth-models";
import { Converter, GeneralError, Is, RandomHelper } from "@twin.org/core";
import { PasswordGenerator, PasswordValidator } from "@twin.org/crypto";
import type { IEntityStorageConnector } from "@twin.org/entity-storage-models";
import { nameof } from "@twin.org/nameof";
import type { AuthenticationUser } from "../entities/authenticationUser.js";

/**
 * Helper class for password operations.
 */
export class PasswordHelper {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<PasswordHelper>();

	/**
	 * Update the password for a user.
	 * Validates password strength, verifies the current password if provided, then hashes and stores the new password and raises an audit event.
	 * @param userEntityStorage The entity storage for users.
	 * @param authenticationAuditService The optional audit service.
	 * @param user The user whose password is being updated.
	 * @param newPassword The new password to set.
	 * @param currentPassword The current password to verify against, if supplied.
	 * @param options Optional password length validation options.
	 * @param options.minPasswordLength Optional minimum password length for validation.
	 * @param options.maxPasswordLength Optional maximum password length for validation.
	 * @returns A promise that resolves when the new password has been stored and the audit entry recorded.
	 */
	public static async updatePassword(
		userEntityStorage: IEntityStorageConnector<AuthenticationUser>,
		authenticationAuditService: IAuthenticationAuditComponent | undefined,
		user: AuthenticationUser,
		newPassword: string,
		currentPassword?: string,
		options?: IPasswordOptions
	): Promise<void> {
		PasswordValidator.validatePassword(newPassword, {
			minLength: options?.minPasswordLength,
			maxLength: options?.maxPasswordLength
		});

		if (Is.stringValue(currentPassword)) {
			const saltBytes = Converter.base64ToBytes(user.salt);
			const passwordBytes = Converter.utf8ToBytes(currentPassword);
			const hashedCurrentPassword = await PasswordGenerator.hashPassword(passwordBytes, saltBytes);
			if (!PasswordValidator.comparePasswordHashes(hashedCurrentPassword, user.password)) {
				throw new GeneralError(PasswordHelper.CLASS_NAME, "currentPasswordMismatch");
			}
		}

		const saltBytes = RandomHelper.generate(16);
		const passwordBytes = Converter.utf8ToBytes(newPassword);
		const hashedPassword = await PasswordGenerator.hashPassword(passwordBytes, saltBytes);

		const updatedUser: AuthenticationUser = {
			email: user.email,
			salt: Converter.bytesToBase64(saltBytes),
			password: hashedPassword,
			identity: user.identity,
			organization: user.organization,
			passwordVersion: (user.passwordVersion ?? 0) + 1
		};

		await userEntityStorage.set(updatedUser);
		await authenticationAuditService?.create({
			actorId: user.email,
			event: AuthAuditEvent.PasswordChanged,
			data: {
				userIdentity: updatedUser.identity,
				organizationIdentity: updatedUser.organization
			}
		});
	}
}
