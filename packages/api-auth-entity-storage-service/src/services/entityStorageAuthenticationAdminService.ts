// Copyright 2024 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type {
	IAuthenticationAdminComponent,
	IAuthenticationUser,
	IAuthenticationUserCreate
} from "@3sixty/api-auth-entity-storage-models";
import { type IAuthenticationAuditComponent, AuthAuditEvent } from "@3sixty/api-auth-models";
import { ForbiddenError, HttpContextIdKeys } from "@3sixty/api-models";
import type { IAuthorizationComponent } from "@3sixty/authorization-models";
import { ContextIdKeys, ContextIdStore } from "@3sixty/context";
import {
	BaseError,
	ComponentFactory,
	Converter,
	GeneralError,
	Guards,
	Is,
	NotFoundError,
	RandomHelper
} from "@3sixty/core";
import { PasswordGenerator, PasswordValidator } from "@3sixty/crypto";
import {
	EntityStorageConnectorFactory,
	type IEntityStorageConnector
} from "@3sixty/entity-storage-models";
import { nameof } from "@3sixty/nameof";
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
	 * The default role that grants escalated privilege.
	 */
	public static readonly DEFAULT_ESCALATED_PRIVILEGE_ROLE: string = "global-admin";

	/**
	 * The default authorization model ID used to look up roles.
	 */
	public static readonly DEFAULT_AUTHORIZATION_MODEL_ID: string = "system";

	/**
	 * The entity storage for users.
	 * @internal
	 */
	private readonly _userEntityStorage: IEntityStorageConnector<AuthenticationUser>;

	/**
	 * The audit component.
	 * @internal
	 */
	private readonly _authenticationAuditService?: IAuthenticationAuditComponent;

	/**
	 * The authorization component used to guard accounts with escalated privilege.
	 * @internal
	 */
	private readonly _authorizationComponent?: IAuthorizationComponent;

	/**
	 * The role that grants escalated privilege.
	 * @internal
	 */
	private readonly _escalatedPrivilegeRole: string;

	/**
	 * The authorization model ID used to look up roles.
	 * @internal
	 */
	private readonly _authorizationModelId: string;

	/**
	 * The minimum password length.
	 * @internal
	 */
	private readonly _minPasswordLength?: number;

	/**
	 * The maximum password length.
	 * @internal
	 */
	private readonly _maxPasswordLength?: number;

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

		this._authorizationComponent = ComponentFactory.getIfExists<IAuthorizationComponent>(
			options?.authorizationComponentType ?? "authorization"
		);

		this._minPasswordLength = options?.config?.minPasswordLength;
		this._maxPasswordLength = options?.config?.maxPasswordLength;
		this._escalatedPrivilegeRole =
			options?.config?.escalatedPrivilegeRole ??
			EntityStorageAuthenticationAdminService.DEFAULT_ESCALATED_PRIVILEGE_ROLE;
		this._authorizationModelId =
			options?.config?.authorizationModelId ??
			EntityStorageAuthenticationAdminService.DEFAULT_AUTHORIZATION_MODEL_ID;
	}

	/**
	 * Map a stored account to the admin response.
	 * @param user The stored account.
	 * @returns The account fields returned to callers. The DID is included only when one is stored.
	 * @internal
	 */
	private static toAuthenticationUser(user: AuthenticationUser): IAuthenticationUser {
		return {
			email: user.email,
			userId: user.userId,
			userIdentity: Is.stringValue(user.identity) ? user.identity : undefined,
			organizationIdentity: user.organization
		};
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
	 * The service allocates the account id. A DID is stored only when one is provided. A missing organisation is taken from the request context.
	 * @param user The user to create.
	 * @returns A promise that resolves when the user account has been created and the audit entry recorded.
	 */
	public async create(user: IAuthenticationUserCreate): Promise<void> {
		Guards.object<IAuthenticationUserCreate>(
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

		let userIdentity: string | undefined;
		if (user.userIdentity !== undefined) {
			userIdentity = user.userIdentity.trim();
			Guards.stringValue(
				EntityStorageAuthenticationAdminService.CLASS_NAME,
				nameof(user.userIdentity),
				userIdentity
			);
		}

		const contextIds = await ContextIdStore.getContextIds();
		const organizationIdentity =
			user.organizationIdentity ?? contextIds?.[ContextIdKeys.Organization] ?? "";
		Guards.stringValue(
			EntityStorageAuthenticationAdminService.CLASS_NAME,
			nameof(user.organizationIdentity),
			organizationIdentity.trim()
		);

		const userId = RandomHelper.generateUuidV7();

		try {
			PasswordValidator.validatePassword(user.password, {
				minLength: this._minPasswordLength,
				maxLength: this._maxPasswordLength
			});

			const existingUser = await this._userEntityStorage.get(user.email);
			if (Is.object<AuthenticationUser>(existingUser)) {
				throw new GeneralError(EntityStorageAuthenticationAdminService.CLASS_NAME, "userExists");
			}

			if (userIdentity !== undefined) {
				// Roles belong to the identity, so a login mapped to an escalated identity inherits them.
				await this.guardEscalatedPrivilegeTarget(userIdentity);
				const existingIdentity = await this._userEntityStorage.get(userIdentity, "identity");
				if (Is.object<AuthenticationUser>(existingIdentity)) {
					throw new GeneralError(
						EntityStorageAuthenticationAdminService.CLASS_NAME,
						"identityInUse"
					);
				}
			}

			const saltBytes = RandomHelper.generate(16);
			const passwordBytes = Converter.utf8ToBytes(user.password);

			const hashedPassword = await PasswordGenerator.hashPassword(passwordBytes, saltBytes);

			const newUser: AuthenticationUser = {
				email: user.email,
				salt: Converter.bytesToBase64(saltBytes),
				password: hashedPassword,
				userId,
				organization: organizationIdentity,
				passwordVersion: 0
			};
			if (userIdentity !== undefined) {
				newUser.identity = userIdentity;
			}

			await this._userEntityStorage.set(newUser);

			const requestorTenantId = contextIds?.[ContextIdKeys.Tenant];
			const originalTenantId = contextIds?.[HttpContextIdKeys.OriginalTenant];
			await this._authenticationAuditService?.create({
				actorId: user.email,
				event: AuthAuditEvent.AccountCreated,
				data: {
					userId,
					userIdentity,
					organizationIdentity,
					tenantId: requestorTenantId,
					originalTenantId
				}
			});
		} catch (error) {
			if (BaseError.isErrorName(error, ForbiddenError.CLASS_NAME)) {
				throw error;
			}
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

			await this.guardEscalatedPrivilegeTarget(existingUser.identity);
			if (Is.stringValue(user.userIdentity) && user.userIdentity !== existingUser.identity) {
				await this.guardEscalatedPrivilegeTarget(user.userIdentity);
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
			const originalTenantId = contextIds?.[HttpContextIdKeys.OriginalTenant];
			await this._authenticationAuditService?.create({
				actorId: existingUser.email,
				event: AuthAuditEvent.AccountUpdated,
				data: {
					updatedFields,
					userId: existingUser.userId,
					userIdentity: Is.stringValue(existingUser.identity) ? existingUser.identity : undefined,
					organizationIdentity: existingUser.organization,
					tenantId: requestorTenantId,
					originalTenantId
				}
			});
		} catch (error) {
			if (BaseError.isErrorName(error, ForbiddenError.CLASS_NAME)) {
				throw error;
			}
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

			return EntityStorageAuthenticationAdminService.toAuthenticationUser(user);
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

			return EntityStorageAuthenticationAdminService.toAuthenticationUser(user);
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

			await this.guardEscalatedPrivilegeTarget(user.identity);

			await this._userEntityStorage.remove(email);

			const contextIds = await ContextIdStore.getContextIds();
			const requestorTenantId = contextIds?.[ContextIdKeys.Tenant];
			const originalTenantId = contextIds?.[HttpContextIdKeys.OriginalTenant];
			await this._authenticationAuditService?.create({
				actorId: email,
				event: AuthAuditEvent.AccountDeleted,
				data: {
					userId: user.userId,
					userIdentity: Is.stringValue(user.identity) ? user.identity : undefined,
					organizationIdentity: user.organization,
					tenantId: requestorTenantId,
					originalTenantId
				}
			});
		} catch (error) {
			if (BaseError.isErrorName(error, ForbiddenError.CLASS_NAME)) {
				throw error;
			}
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

			await this.guardEscalatedPrivilegeTarget(user.identity);

			await PasswordHelper.updatePassword(
				this._userEntityStorage,
				this._authenticationAuditService,
				user,
				newPassword,
				currentPassword,
				{
					minPasswordLength: this._minPasswordLength,
					maxPasswordLength: this._maxPasswordLength
				}
			);
		} catch (error) {
			if (BaseError.isErrorName(error, ForbiddenError.CLASS_NAME)) {
				throw error;
			}
			throw new GeneralError(
				EntityStorageAuthenticationAdminService.CLASS_NAME,
				"updatePasswordFailed",
				undefined,
				error
			);
		}
	}

	/**
	 * Ensure the caller holds escalated privilege when the target identity holds it.
	 * @param targetIdentity The identity of the account being modified. Accounts with no DID are skipped.
	 * @throws ForbiddenError if the target holds escalated privilege and the caller does not.
	 * @internal
	 */
	private async guardEscalatedPrivilegeTarget(targetIdentity?: string): Promise<void> {
		if (!Is.stringValue(targetIdentity) || Is.empty(this._authorizationComponent)) {
			return;
		}

		const targetIsEscalated = await this._authorizationComponent.hasRoleForSubject(
			this._authorizationModelId,
			targetIdentity,
			this._escalatedPrivilegeRole
		);
		if (!targetIsEscalated) {
			return;
		}

		const contextIds = await ContextIdStore.getContextIds();
		const callerIdentity = contextIds?.[ContextIdKeys.User];
		const callerIsEscalated =
			Is.stringValue(callerIdentity) &&
			(await this._authorizationComponent.hasRoleForSubject(
				this._authorizationModelId,
				callerIdentity,
				this._escalatedPrivilegeRole
			));

		if (!callerIsEscalated) {
			throw new ForbiddenError(
				EntityStorageAuthenticationAdminService.CLASS_NAME,
				"insufficientRoleForEscalatedTarget",
				{ roleName: this._escalatedPrivilegeRole }
			);
		}
	}
}
