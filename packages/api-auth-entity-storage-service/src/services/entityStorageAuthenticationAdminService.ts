// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type {
	IAuthenticationAdminComponent,
	IAuthenticationUser
} from "@twin.org/api-auth-entity-storage-models";
import type { IAuthenticationAuditComponent } from "@twin.org/api-auth-models";
import { AuthAuditEvent } from "@twin.org/api-auth-models";
import { ContextIdKeys, ContextIdStore } from "@twin.org/context";
import {
	ComponentFactory,
	Converter,
	GeneralError,
	Guards,
	Is,
	NotFoundError,
	RandomHelper
} from "@twin.org/core";
import { PasswordGenerator, PasswordValidator } from "@twin.org/crypto";
import {
	EntityStorageConnectorFactory,
	type IEntityStorageConnector
} from "@twin.org/entity-storage-models";
import { nameof } from "@twin.org/nameof";
import type { AuthenticationUser } from "../entities/authenticationUser.js";
import type { IEntityStorageAuthenticationAdminServiceConstructorOptions } from "../models/IEntityStorageAuthenticationAdminServiceConstructorOptions.js";
import { PasswordHelper } from "../utils/passwordHelper.js";

/**
 * Implementation of the authentication component using entity storage.
 */
export class EntityStorageAuthenticationAdminService implements IAuthenticationAdminComponent {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<EntityStorageAuthenticationAdminService>();

	/**
	 * The entity storage for users.
	 * @internal
	 */
	private readonly _userEntityStorage: IEntityStorageConnector<AuthenticationUser>;

	/**
	 * The audit service.
	 * @internal
	 */
	private readonly _authenticationAuditService?: IAuthenticationAuditComponent;

	/**
	 * The minimum password length.
	 * @internal
	 */
	private readonly _minPasswordLength?: number;

	/**
	 * Create a new instance of EntityStorageAuthentication.
	 * @param options The dependencies for the identity connector.
	 */
	constructor(options?: IEntityStorageAuthenticationAdminServiceConstructorOptions) {
		this._userEntityStorage = EntityStorageConnectorFactory.get(
			options?.userEntityStorageType ?? "authentication-user"
		);

		this._authenticationAuditService = ComponentFactory.getIfExists<IAuthenticationAuditComponent>(
			options?.authenticationAuditServiceType ?? "authentication-audit"
		);

		this._minPasswordLength = options?.config?.minPasswordLength;
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return EntityStorageAuthenticationAdminService.CLASS_NAME;
	}

	/**
	 * Create a login for the user.
	 * @param user The user to create.
	 * @returns A promise that resolves when the user account has been created and the audit entry recorded.
	 */
	public async create(user: IAuthenticationUser & { password: string }): Promise<void> {
		Guards.object<IAuthenticationUser>(
			EntityStorageAuthenticationAdminService.CLASS_NAME,
			nameof(user),
			user
		);
		Guards.stringValue(
			EntityStorageAuthenticationAdminService.CLASS_NAME,
			nameof(user.email),
			user.email
		);
		Guards.stringValue(
			EntityStorageAuthenticationAdminService.CLASS_NAME,
			nameof(user.password),
			user.password
		);
		Guards.stringValue(
			EntityStorageAuthenticationAdminService.CLASS_NAME,
			nameof(user.userIdentity),
			user.userIdentity
		);
		Guards.stringValue(
			EntityStorageAuthenticationAdminService.CLASS_NAME,
			nameof(user.organizationIdentity),
			user.organizationIdentity
		);

		try {
			PasswordValidator.validatePassword(user.password, {
				minLength: this._minPasswordLength
			});

			const existingUser = await this._userEntityStorage.get(user.email);
			if (Is.object<AuthenticationUser>(existingUser)) {
				throw new GeneralError(EntityStorageAuthenticationAdminService.CLASS_NAME, "userExists");
			}

			const saltBytes = RandomHelper.generate(16);
			const passwordBytes = Converter.utf8ToBytes(user.password);

			const hashedPassword = await PasswordGenerator.hashPassword(passwordBytes, saltBytes);

			const newUser: AuthenticationUser = {
				email: user.email,
				salt: Converter.bytesToBase64(saltBytes),
				password: hashedPassword,
				identity: user.userIdentity,
				organization: user.organizationIdentity,
				passwordVersion: 0
			};

			await this._userEntityStorage.set(newUser);

			const contextIds = await ContextIdStore.getContextIds();
			const requestorTenantId = contextIds?.[ContextIdKeys.Tenant];
			await this._authenticationAuditService?.create({
				actorId: user.email,
				event: AuthAuditEvent.AccountCreated,
				data: {
					userIdentity: user.userIdentity,
					organizationIdentity: user.organizationIdentity,
					tenantId: requestorTenantId
				}
			});
		} catch (error) {
			throw new GeneralError(
				EntityStorageAuthenticationAdminService.CLASS_NAME,
				"createUserFailed",
				undefined,
				error
			);
		}
	}

	/**
	 * Update a login for the user.
	 * @param user The user to update.
	 * @returns A promise that resolves when the user account has been updated and the audit entry recorded.
	 */
	public async update(user: Partial<IAuthenticationUser>): Promise<void> {
		Guards.object<IAuthenticationUser>(
			EntityStorageAuthenticationAdminService.CLASS_NAME,
			nameof(user),
			user
		);
		Guards.stringValue(
			EntityStorageAuthenticationAdminService.CLASS_NAME,
			nameof(user.email),
			user.email
		);

		if (!Is.empty(user.userIdentity)) {
			Guards.stringValue(
				EntityStorageAuthenticationAdminService.CLASS_NAME,
				nameof(user.userIdentity),
				user.userIdentity
			);
		}
		if (!Is.empty(user.organizationIdentity)) {
			Guards.stringValue(
				EntityStorageAuthenticationAdminService.CLASS_NAME,
				nameof(user.organizationIdentity),
				user.organizationIdentity
			);
		}

		try {
			const existingUser = await this._userEntityStorage.get(user.email);
			if (!Is.object<AuthenticationUser>(existingUser)) {
				throw new NotFoundError(
					EntityStorageAuthenticationAdminService.CLASS_NAME,
					"userNotFound",
					user.email
				);
			}

			const updatedFields: string[] = [];

			if (user.userIdentity !== undefined && user.userIdentity !== existingUser.identity) {
				updatedFields.push("userIdentity");
			}
			if (
				user.organizationIdentity !== undefined &&
				user.organizationIdentity !== existingUser.organization
			) {
				updatedFields.push("organizationIdentity");
			}

			existingUser.identity = user.userIdentity ?? existingUser.identity;
			existingUser.organization = user.organizationIdentity ?? existingUser.organization;

			await this._userEntityStorage.set(existingUser);

			const contextIds = await ContextIdStore.getContextIds();
			const requestorTenantId = contextIds?.[ContextIdKeys.Tenant];
			await this._authenticationAuditService?.create({
				actorId: existingUser.email,
				event: AuthAuditEvent.AccountUpdated,
				data: {
					updatedFields,
					userIdentity: existingUser.identity,
					organizationIdentity: existingUser.organization,
					tenantId: requestorTenantId
				}
			});
		} catch (error) {
			throw new GeneralError(
				EntityStorageAuthenticationAdminService.CLASS_NAME,
				"updateUserFailed",
				undefined,
				error
			);
		}
	}

	/**
	 * Get a user by email.
	 * @param email The email address of the user to get.
	 * @returns The user details.
	 */
	public async get(email: string): Promise<IAuthenticationUser> {
		Guards.stringValue(EntityStorageAuthenticationAdminService.CLASS_NAME, nameof(email), email);

		try {
			const user = await this._userEntityStorage.get(email);
			if (!Is.object<AuthenticationUser>(user)) {
				throw new NotFoundError(
					EntityStorageAuthenticationAdminService.CLASS_NAME,
					"userNotFound",
					email
				);
			}

			return {
				email: user.email,
				userIdentity: user.identity,
				organizationIdentity: user.organization
			};
		} catch (error) {
			throw new GeneralError(
				EntityStorageAuthenticationAdminService.CLASS_NAME,
				"getUserFailed",
				undefined,
				error
			);
		}
	}

	/**
	 * Get a user by identity.
	 * @param identity The identity of the user to get.
	 * @returns The user details.
	 */
	public async getByIdentity(identity: string): Promise<IAuthenticationUser> {
		Guards.stringValue(
			EntityStorageAuthenticationAdminService.CLASS_NAME,
			nameof(identity),
			identity
		);

		try {
			const user = await this._userEntityStorage.get(identity, "identity");
			if (!Is.object<AuthenticationUser>(user)) {
				throw new NotFoundError(
					EntityStorageAuthenticationAdminService.CLASS_NAME,
					"userNotFound",
					identity
				);
			}

			return {
				email: user.email,
				userIdentity: user.identity,
				organizationIdentity: user.organization
			};
		} catch (error) {
			throw new GeneralError(
				EntityStorageAuthenticationAdminService.CLASS_NAME,
				"getUserFailed",
				undefined,
				error
			);
		}
	}

	/**
	 * Remove the current user.
	 * @param email The email address of the user to remove.
	 * @returns A promise that resolves when the user account has been removed and the audit entry recorded.
	 */
	public async remove(email: string): Promise<void> {
		Guards.stringValue(EntityStorageAuthenticationAdminService.CLASS_NAME, nameof(email), email);

		try {
			const user = await this._userEntityStorage.get(email);
			if (!Is.object<AuthenticationUser>(user)) {
				throw new NotFoundError(
					EntityStorageAuthenticationAdminService.CLASS_NAME,
					"userNotFound",
					email
				);
			}

			await this._userEntityStorage.remove(email);

			const contextIds = await ContextIdStore.getContextIds();
			const requestorTenantId = contextIds?.[ContextIdKeys.Tenant];
			await this._authenticationAuditService?.create({
				actorId: email,
				event: AuthAuditEvent.AccountDeleted,
				data: {
					userIdentity: user.identity,
					organizationIdentity: user.organization,
					tenantId: requestorTenantId
				}
			});
		} catch (error) {
			throw new GeneralError(
				EntityStorageAuthenticationAdminService.CLASS_NAME,
				"removeUserFailed",
				undefined,
				error
			);
		}
	}

	/**
	 * Update the user's password.
	 * @param email The email address of the user to update.
	 * @param newPassword The new password for the user.
	 * @param currentPassword The current password, optional, if supplied will check against existing.
	 * @returns A promise that resolves when the password has been updated.
	 */
	public async updatePassword(
		email: string,
		newPassword: string,
		currentPassword?: string
	): Promise<void> {
		Guards.stringValue(EntityStorageAuthenticationAdminService.CLASS_NAME, nameof(email), email);
		Guards.stringValue(
			EntityStorageAuthenticationAdminService.CLASS_NAME,
			nameof(newPassword),
			newPassword
		);

		try {
			const user = await this._userEntityStorage.get(email);
			if (!Is.object<AuthenticationUser>(user)) {
				throw new NotFoundError(
					EntityStorageAuthenticationAdminService.CLASS_NAME,
					"userNotFound",
					email
				);
			}

			await PasswordHelper.updatePassword(
				this._userEntityStorage,
				this._authenticationAuditService,
				user,
				newPassword,
				currentPassword,
				this._minPasswordLength
			);
		} catch (error) {
			throw new GeneralError(
				EntityStorageAuthenticationAdminService.CLASS_NAME,
				"updatePasswordFailed",
				undefined,
				error
			);
		}
	}
}
