// Copyright 2024 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type {
	IPasswordHashOptions,
	IPasswordOptions
} from "@3sixty/api-auth-entity-storage-models";
import type { IAuthenticationAuditComponent } from "@3sixty/api-auth-models";
import { AuthAuditEvent, EmailHelper } from "@3sixty/api-auth-models";
import { ForbiddenError } from "@3sixty/api-models";
import { Coerce, Converter, GeneralError, Guards, Is, RandomHelper } from "@3sixty/core";
import { Argon2id, PasswordGenerator, PasswordValidator } from "@3sixty/crypto";
import type { IEntityStorageConnector } from "@3sixty/entity-storage-models";
import { nameof } from "@3sixty/nameof";
import { AccountHelper } from "./accountHelper.js";
import { AuthTokenCache } from "./authTokenCache.js";
import { PasswordResetHelper } from "./passwordResetHelper.js";
import type { AuthenticationPasswordReset } from "../entities/authenticationPasswordReset.js";
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
	 * The algorithm stored with Argon2id password hashes.
	 */
	public static readonly ALGORITHM_ARGON2ID: string = "argon2id";

	/**
	 * The default Argon2id iterations.
	 */
	public static readonly DEFAULT_ITERATIONS: number = 2;

	/**
	 * The default Argon2id memory in kibibytes.
	 */
	public static readonly DEFAULT_MEMORY_KIB: number = 19456;

	/**
	 * The default Argon2id parallelism.
	 */
	public static readonly DEFAULT_PARALLELISM: number = 1;

	/**
	 * The length of a derived key in bytes.
	 * @internal
	 */
	private static readonly _KEY_LENGTH: number = 32;

	/**
	 * The length of a salt in bytes.
	 * @internal
	 */
	private static readonly _SALT_LENGTH: number = 16;

	/**
	 * Hash a password with Argon2id and a new salt.
	 * @param password The password.
	 * @param hashOptions The Argon2id parameters.
	 * @returns The fields to store on the account.
	 */
	public static async hashPassword(
		password: string,
		hashOptions?: IPasswordHashOptions
	): Promise<
		Required<
			Pick<AuthenticationUser, "password" | "salt" | "passwordAlgorithm" | "passwordHashParameters">
		>
	> {
		const parameters = PasswordHelper.parameters(hashOptions);
		const saltBytes = RandomHelper.generate(PasswordHelper._SALT_LENGTH);
		const hash = await PasswordHelper.argon2id(password, saltBytes, parameters);
		return {
			password: Converter.bytesToBase64(hash),
			salt: Converter.bytesToBase64(saltBytes),
			passwordAlgorithm: PasswordHelper.ALGORITHM_ARGON2ID,
			passwordHashParameters: `t=${parameters.t},m=${parameters.m},p=${parameters.p}`
		};
	}

	/**
	 * Check a password against the hash stored on an account, legacy Blake2b hashes included, in
	 * constant time.
	 * @param user The account.
	 * @param password The password to check.
	 * @returns True when the password matches.
	 */
	public static async verifyPassword(user: AuthenticationUser, password: string): Promise<boolean> {
		if (!Is.stringValue(user.password) || !Is.stringValue(user.salt) || !Is.string(password)) {
			return false;
		}
		const saltBytes = Converter.base64ToBytes(user.salt);

		if (user.passwordAlgorithm === PasswordHelper.ALGORITHM_ARGON2ID) {
			const hash = await PasswordHelper.argon2id(
				password,
				saltBytes,
				PasswordHelper.parseParameters(user.passwordHashParameters)
			);
			return PasswordValidator.comparePasswordBytes(hash, Converter.base64ToBytes(user.password));
		}

		if (Is.stringValue(user.passwordAlgorithm)) {
			return false;
		}

		const legacyHash = await PasswordGenerator.hashPassword(
			Converter.utf8ToBytes(password),
			saltBytes
		);
		return PasswordValidator.comparePasswordHashes(legacyHash, user.password);
	}

	/**
	 * Hash a password that is not checked against anything, so a sign in for an unknown account takes
	 * as long as one for a known account.
	 * @param password The password.
	 * @param hashOptions The Argon2id parameters.
	 * @returns A promise that resolves when the hash has been computed.
	 */
	public static async dummyVerify(
		password: string,
		hashOptions?: IPasswordHashOptions
	): Promise<void> {
		await PasswordHelper.argon2id(
			password,
			new Uint8Array(PasswordHelper._SALT_LENGTH),
			PasswordHelper.parameters(hashOptions)
		);
	}

	/**
	 * Check whether the password hash of an account should be replaced, as it is a legacy hash or
	 * uses other parameters.
	 * @param user The account.
	 * @param hashOptions The Argon2id parameters for new hashes.
	 * @returns True when the hash should be replaced.
	 */
	public static needsRehash(user: AuthenticationUser, hashOptions?: IPasswordHashOptions): boolean {
		if (user.passwordAlgorithm !== PasswordHelper.ALGORITHM_ARGON2ID) {
			return true;
		}
		const stored = PasswordHelper.parseParameters(user.passwordHashParameters);
		const wanted = PasswordHelper.parameters(hashOptions);
		return stored.t !== wanted.t || stored.m !== wanted.m || stored.p !== wanted.p;
	}

	/**
	 * Create an account that signs in with a password.
	 * @param userEntityStorage The entity storage for users.
	 * @param authProviderId The authentication provider id of password accounts.
	 * @param accountId The account id to use.
	 * @param email The e-mail address of the account, stored normalised.
	 * @param password The password of the account.
	 * @param options Optional password length validation options.
	 * @param settings Optional settings for the new account.
	 * @param settings.passwordHashOptions The Argon2id parameters.
	 * @param settings.verified False when the e-mail address must still be verified.
	 * @param settings.disabled True to create the account disabled.
	 * @returns The new account.
	 */
	public static async createUser(
		userEntityStorage: IEntityStorageConnector<AuthenticationUser>,
		authProviderId: string,
		accountId: string,
		email: string,
		password: string,
		options?: IPasswordOptions,
		settings?: {
			passwordHashOptions?: IPasswordHashOptions;
			verified?: boolean;
			disabled?: boolean;
		}
	): Promise<AuthenticationUser> {
		PasswordValidator.validatePassword(password, {
			minLength: options?.minPasswordLength,
			maxLength: options?.maxPasswordLength
		});

		return PasswordHelper.createUserWithHash(
			userEntityStorage,
			authProviderId,
			accountId,
			email,
			await PasswordHelper.hashPassword(password, settings?.passwordHashOptions),
			settings
		);
	}

	/**
	 * Create an account that signs in with a password already validated and hashed.
	 * @param userEntityStorage The entity storage for users.
	 * @param authProviderId The authentication provider id of password accounts.
	 * @param accountId The account id to use.
	 * @param email The e-mail address of the account, stored normalised.
	 * @param passwordHash The password hash, from hashPassword.
	 * @param settings Optional settings for the new account.
	 * @param settings.verified False when the e-mail address must still be verified.
	 * @param settings.disabled True to create the account disabled.
	 * @returns The new account.
	 */
	public static async createUserWithHash(
		userEntityStorage: IEntityStorageConnector<AuthenticationUser>,
		authProviderId: string,
		accountId: string,
		email: string,
		passwordHash: Required<
			Pick<AuthenticationUser, "password" | "salt" | "passwordAlgorithm" | "passwordHashParameters">
		>,
		settings?: {
			verified?: boolean;
			disabled?: boolean;
		}
	): Promise<AuthenticationUser> {
		const normalisedEmail = EmailHelper.normalise(email);
		const now = new Date().toISOString();
		const user: AuthenticationUser = {
			email: normalisedEmail,
			password: passwordHash.password,
			salt: passwordHash.salt,
			passwordAlgorithm: passwordHash.passwordAlgorithm,
			passwordHashParameters: passwordHash.passwordHashParameters,
			accountId,
			authProviderId,
			providerAccountId: normalisedEmail,
			passwordVersion: 0,
			dateCreated: now,
			dateModified: now,
			verified: settings?.verified === false ? false : undefined,
			dateDisabled: settings?.disabled === true ? now : undefined
		};
		await userEntityStorage.set(user);
		return user;
	}

	/**
	 * Update the password for a user, ending its sessions and removing its password reset tokens.
	 * The current password must be given and match unless requireCurrentPassword is false, as for an
	 * admin or a password reset, it is still checked when given.
	 * @param userEntityStorage The entity storage for users.
	 * @param authenticationAuditService The optional audit service.
	 * @param user The user whose password is being updated.
	 * @param newPassword The new password to set.
	 * @param currentPassword The current password to verify against.
	 * @param options Optional password length validation options.
	 * @param settings Optional settings for the update.
	 * @param settings.requireCurrentPassword False when the current password is not required.
	 * @param settings.passwordHashOptions The Argon2id parameters.
	 * @param settings.passwordResetEntityStorage The storage of the password reset tokens to remove.
	 * @param settings.actorAccountId The account making the change, when it is not the user.
	 * @param settings.markVerified True to also mark the e-mail address of the account verified.
	 * @returns The updated account.
	 * @throws ForbiddenError when the current password is given and does not match.
	 * @throws ConflictError when the account kept changing or was removed during the update.
	 */
	public static async updatePassword(
		userEntityStorage: IEntityStorageConnector<AuthenticationUser>,
		authenticationAuditService: IAuthenticationAuditComponent,
		user: AuthenticationUser,
		newPassword: string,
		currentPassword?: string,
		options?: IPasswordOptions,
		settings?: {
			requireCurrentPassword?: boolean;
			passwordHashOptions?: IPasswordHashOptions;
			passwordResetEntityStorage?: IEntityStorageConnector<AuthenticationPasswordReset>;
			actorAccountId?: string;
			markVerified?: boolean;
		}
	): Promise<AuthenticationUser> {
		if (!Is.stringValue(user.password) || !Is.stringValue(user.salt)) {
			throw new GeneralError(PasswordHelper.CLASS_NAME, "passwordNotSet");
		}

		if (settings?.requireCurrentPassword ?? true) {
			Guards.stringValue(PasswordHelper.CLASS_NAME, nameof(currentPassword), currentPassword);
		}

		PasswordValidator.validatePassword(newPassword, {
			minLength: options?.minPasswordLength,
			maxLength: options?.maxPasswordLength
		});

		let newHash: Awaited<ReturnType<typeof PasswordHelper.hashPassword>> | undefined;
		// The account is checked again when a concurrent change won, so a disable or another password
		// change made meanwhile is kept, and the current password is checked against the hash it set.
		const updatedUser = await AccountHelper.update(userEntityStorage, user, async current => {
			if (!Is.stringValue(current.password) || !Is.stringValue(current.salt)) {
				throw new GeneralError(PasswordHelper.CLASS_NAME, "passwordNotSet");
			}
			if (
				Is.stringValue(currentPassword) &&
				!(await PasswordHelper.verifyPassword(current, currentPassword))
			) {
				throw new ForbiddenError(PasswordHelper.CLASS_NAME, "currentPasswordMismatch");
			}
			newHash ??= await PasswordHelper.hashPassword(newPassword, settings?.passwordHashOptions);
			return {
				...current,
				...newHash,
				verified: settings?.markVerified === true ? true : current.verified,
				passwordVersion: (current.passwordVersion ?? 0) + 1,
				dateModified: new Date().toISOString()
			};
		});
		if (!Is.object<AuthenticationUser>(updatedUser)) {
			throw new GeneralError(PasswordHelper.CLASS_NAME, "passwordNotSet");
		}
		AuthTokenCache.invalidate(user.accountId);

		if (Is.object(settings?.passwordResetEntityStorage)) {
			await PasswordResetHelper.removeForAccount(
				settings.passwordResetEntityStorage,
				user.accountId
			);
		}

		await authenticationAuditService.create({
			actorId: settings?.actorAccountId ?? user.email,
			event: AuthAuditEvent.PasswordChanged,
			data: {
				accountId: updatedUser.accountId,
				email: updatedUser.email,
				actorAccountId: settings?.actorAccountId
			}
		});

		return updatedUser;
	}

	/**
	 * Get the Argon2id parameters with their defaults.
	 * @param hashOptions The configured parameters.
	 * @returns The parameters.
	 * @internal
	 */
	private static parameters(hashOptions?: IPasswordHashOptions): {
		t: number;
		m: number;
		p: number;
	} {
		return {
			t: hashOptions?.iterations ?? PasswordHelper.DEFAULT_ITERATIONS,
			m: hashOptions?.memoryKiB ?? PasswordHelper.DEFAULT_MEMORY_KIB,
			p: hashOptions?.parallelism ?? PasswordHelper.DEFAULT_PARALLELISM
		};
	}

	/**
	 * Parse the stored Argon2id parameters, the defaults fill any that are missing.
	 * @param stored The stored parameters, such as t=2,m=19456,p=1.
	 * @returns The parameters.
	 * @internal
	 */
	private static parseParameters(stored: string | undefined): { t: number; m: number; p: number } {
		const values: { [key: string]: number | undefined } = {};
		for (const part of (stored ?? "").split(",")) {
			const [key, value] = part.split("=");
			values[key.trim()] = Coerce.integer(value);
		}
		return PasswordHelper.parameters({
			iterations: values.t,
			memoryKiB: values.m,
			parallelism: values.p
		});
	}

	/**
	 * Derive the Argon2id hash of a password.
	 * @param password The password.
	 * @param saltBytes The salt.
	 * @param parameters The parameters.
	 * @param parameters.t The iterations.
	 * @param parameters.m The memory in kibibytes.
	 * @param parameters.p The parallelism.
	 * @returns The hash.
	 * @internal
	 */
	private static async argon2id(
		password: string,
		saltBytes: Uint8Array,
		parameters: { t: number; m: number; p: number }
	): Promise<Uint8Array> {
		return Argon2id.hash(Converter.utf8ToBytes(password), saltBytes, {
			...parameters,
			dkLen: PasswordHelper._KEY_LENGTH
		});
	}
}
