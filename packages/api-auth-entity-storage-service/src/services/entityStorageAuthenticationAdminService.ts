// Copyright 2024 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type {
	IAuthenticationAdminComponent,
	IAuthenticationUser,
	IAuthenticationUserCreate,
	IPasswordHashOptions
} from "@3sixty/api-auth-entity-storage-models";
import {
	type IAuthenticationAccountAdminComponent,
	type IAuthenticationAccountData,
	type IAuthenticationAuditComponent,
	type IOrganizationRequestAdminComponent,
	AuthAuditEvent,
	AuthenticationAccountDataType,
	AuthenticationAccountHelper,
	EmailHelper
} from "@3sixty/api-auth-models";
import { ForbiddenError, HttpContextIdKeys } from "@3sixty/api-models";
import type { IAuthorizationComponent } from "@3sixty/authorization-models";
import { ContextIdKeys, ContextIdStore } from "@3sixty/context";
import {
	BaseError,
	ComponentFactory,
	ConflictError,
	GeneralError,
	Guards,
	Is,
	NotFoundError,
	RandomHelper
} from "@3sixty/core";
import { ComparisonOperator, LogicalOperator } from "@3sixty/entity";
import {
	EntityStorageConnectorFactory,
	type IEntityStorageConnector
} from "@3sixty/entity-storage-models";
import { nameof } from "@3sixty/nameof";
import type { AuthenticationPasswordReset } from "../entities/authenticationPasswordReset.js";
import type { AuthenticationUser } from "../entities/authenticationUser.js";
import type { IEntityStorageAuthenticationAdminServiceConstructorOptions } from "../models/IEntityStorageAuthenticationAdminServiceConstructorOptions.js";
import { AccountHelper } from "../utils/accountHelper.js";
import { PasswordHelper } from "../utils/passwordHelper.js";
import { PasswordResetHelper } from "../utils/passwordResetHelper.js";

/**
 * Implementation of the authentication admin component using entity storage. Callers act on every
 * account of their tenant, only callers holding the escalated privilege role may act on accounts
 * that hold it. Calls without a caller account, such as from the node CLI, are system calls.
 */
export class EntityStorageAuthenticationAdminService implements IAuthenticationAdminComponent {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<EntityStorageAuthenticationAdminService>();

	/**
	 * The provider id stored on accounts created by this service.
	 */
	public static readonly AUTH_PROVIDER_ID: string = "entity-storage";

	/**
	 * The default role that grants escalated privilege.
	 */
	public static readonly DEFAULT_ESCALATED_PRIVILEGE_ROLE: string = "global-admin";

	/**
	 * The default authorization model ID used to look up roles.
	 */
	public static readonly DEFAULT_AUTHORIZATION_MODEL_ID: string = "system";

	/**
	 * The most accounts of an e-mail address read at once when finding a user.
	 * @internal
	 */
	private static readonly _FIND_USER_LIMIT: number = 10;

	/**
	 * The entity storage for users.
	 * @internal
	 */
	private readonly _userEntityStorage: IEntityStorageConnector<AuthenticationUser>;

	/**
	 * The entity storage for password reset tokens, when it exists.
	 * @internal
	 */
	private readonly _passwordResetEntityStorage?: IEntityStorageConnector<AuthenticationPasswordReset>;

	/**
	 * The audit component.
	 * @internal
	 */
	private readonly _authenticationAuditService?: IAuthenticationAuditComponent;

	/**
	 * The account data admin component type, resolved when a user is removed.
	 * @internal
	 */
	private readonly _authenticationAccountAdminComponentType: string;

	/**
	 * The organization request admin component type, resolved when a user is removed.
	 * @internal
	 */
	private readonly _organizationRequestAdminComponentType: string;

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
	 * The Argon2id parameters for new passwords.
	 * @internal
	 */
	private readonly _passwordHashOptions?: IPasswordHashOptions;

	/**
	 * Create a new instance of EntityStorageAuthentication.
	 * @param options The dependencies for the identity connector.
	 */
	constructor(options?: IEntityStorageAuthenticationAdminServiceConstructorOptions) {
		this._userEntityStorage = EntityStorageConnectorFactory.get(
			options?.userEntityStorageType ?? "authentication-user"
		);

		this._passwordResetEntityStorage = EntityStorageConnectorFactory.getIfExists(
			options?.passwordResetEntityStorageType ?? "authentication-password-reset"
		);

		this._authenticationAuditService = ComponentFactory.getIfExists<IAuthenticationAuditComponent>(
			options?.authenticationAuditServiceType ?? "authentication-audit"
		);

		this._authenticationAccountAdminComponentType =
			options?.authenticationAccountAdminComponentType ?? "authentication-account-admin";
		this._organizationRequestAdminComponentType =
			options?.organizationRequestAdminComponentType ?? "organization-request-admin";

		this._authorizationComponent = ComponentFactory.getIfExists<IAuthorizationComponent>(
			options?.authorizationComponentType ?? "authorization"
		);
		this._escalatedPrivilegeRole =
			options?.config?.escalatedPrivilegeRole ??
			EntityStorageAuthenticationAdminService.DEFAULT_ESCALATED_PRIVILEGE_ROLE;
		this._authorizationModelId =
			options?.config?.authorizationModelId ??
			EntityStorageAuthenticationAdminService.DEFAULT_AUTHORIZATION_MODEL_ID;

		this._minPasswordLength = options?.config?.minPasswordLength;
		this._maxPasswordLength = options?.config?.maxPasswordLength;
		this._passwordHashOptions = options?.config?.passwordHashOptions;
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return EntityStorageAuthenticationAdminService.CLASS_NAME;
	}

	/**
	 * Create a login for the user, its e-mail address is treated as verified.
	 * The service allocates the account id.
	 * @param user The user to create.
	 * @returns A promise that resolves when the user account has been created and the audit entry recorded.
	 * @throws ConflictError when a password account exists for the e-mail address.
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

		const accountId = RandomHelper.generateUuidV7();

		try {
			const existingUser = await AccountHelper.findByEmail(
				this._userEntityStorage,
				EntityStorageAuthenticationAdminService.AUTH_PROVIDER_ID,
				user.email
			);
			if (Is.object<AuthenticationUser>(existingUser)) {
				throw new ConflictError(
					EntityStorageAuthenticationAdminService.CLASS_NAME,
					"userExists",
					EmailHelper.normalise(user.email)
				);
			}

			const created = await PasswordHelper.createUser(
				this._userEntityStorage,
				EntityStorageAuthenticationAdminService.AUTH_PROVIDER_ID,
				accountId,
				user.email,
				user.password,
				{
					minPasswordLength: this._minPasswordLength,
					maxPasswordLength: this._maxPasswordLength
				},
				{ passwordHashOptions: this._passwordHashOptions, disabled: user.disabled }
			);

			await this.audit(AuthAuditEvent.AccountCreated, created, {
				disabled: AccountHelper.isDisabled(created)
			});
		} catch (error) {
			if (this.isPassThroughError(error)) {
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
	 * Get a user of any authentication provider.
	 * @param email The email address of the user to get, or the account id.
	 * @returns The user details.
	 */
	public async get(email: string): Promise<IAuthenticationUser> {
		Guards.stringValue(EntityStorageAuthenticationAdminService.CLASS_NAME, nameof(email), email);

		try {
			const user = await this.findUser(email);
			return {
				...this.toAuthenticationUser(user),
				...(await this.accountContext(user.accountId))
			};
		} catch (error) {
			if (this.isPassThroughError(error)) {
				throw error;
			}
			throw new GeneralError(
				EntityStorageAuthenticationAdminService.CLASS_NAME,
				"getUserFailed",
				undefined,
				error
			);
		}
	}

	/**
	 * Get the user whose identity account data holds the DID.
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
			const accountAdmin = this.getAccountAdmin();
			let item: IAuthenticationAccountData | undefined;
			if (Is.object(accountAdmin)) {
				// The id of an identity item is derived from its DID, so it is a single get.
				try {
					item = await accountAdmin.get(AuthenticationAccountHelper.identityItemId(identity));
				} catch (error) {
					if (!BaseError.isErrorName(error, NotFoundError.CLASS_NAME)) {
						throw error;
					}
				}
			}

			const user =
				Is.object(item) &&
				item.type === AuthenticationAccountDataType.Identity &&
				AuthenticationAccountHelper.getIdentity(item.data) === identity
					? await this._userEntityStorage.get(item.accountId)
					: undefined;
			if (!Is.object<AuthenticationUser>(user)) {
				throw new NotFoundError(
					EntityStorageAuthenticationAdminService.CLASS_NAME,
					"userNotFound",
					identity
				);
			}
			return {
				...this.toAuthenticationUser(user),
				...(await this.accountContext(user.accountId))
			};
		} catch (error) {
			if (this.isPassThroughError(error)) {
				throw error;
			}
			throw new GeneralError(
				EntityStorageAuthenticationAdminService.CLASS_NAME,
				"getUserFailed",
				undefined,
				error
			);
		}
	}

	/**
	 * Update the identity or organization of a user through its account data. The organization
	 * becomes the default organization of the account, the identity replaces any identity it has.
	 * Callers without escalated privilege may not change an escalated account or their own account,
	 * and must bind an identity through the account service, which takes a proof of the DID.
	 * @param user The user to update, found by email address or account id.
	 * @returns A promise that resolves when the user account has been updated.
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
			const existing = await this.findUser(user.email);
			await this.guardEscalatedPrivilegeTarget(existing.accountId);

			const updatedFields: string[] = [];
			if (Is.stringValue(user.userIdentity) || Is.stringValue(user.organizationIdentity)) {
				const accountAdmin = this.getAccountAdmin();
				if (Is.empty(accountAdmin)) {
					throw new GeneralError(
						EntityStorageAuthenticationAdminService.CLASS_NAME,
						"accountAdminMissing"
					);
				}
				if (
					Is.stringValue(user.userIdentity) &&
					(await this.replaceIdentity(accountAdmin, existing.accountId, user.userIdentity))
				) {
					updatedFields.push("userIdentity");
				}
				if (Is.stringValue(user.organizationIdentity)) {
					const current = await this.defaultItem(
						accountAdmin,
						existing.accountId,
						AuthenticationAccountDataType.Organization
					);
					if (
						AuthenticationAccountHelper.getOrganization(current?.data) !== user.organizationIdentity
					) {
						await accountAdmin.create(
							existing.accountId,
							AuthenticationAccountDataType.Organization,
							AuthenticationAccountHelper.createOrganizationData(user.organizationIdentity),
							true
						);
						updatedFields.push("organizationIdentity");
					}
				}
			}

			if (updatedFields.length > 0) {
				await this.audit(AuthAuditEvent.AccountUpdated, existing, {
					updatedFields,
					userIdentity: user.userIdentity,
					organizationIdentity: user.organizationIdentity
				});
			}
		} catch (error) {
			if (this.isPassThroughError(error)) {
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
	 * Remove a user of any authentication provider. The account is disabled first so its sessions
	 * end, then the data stored for it, its roles and its requests to join an organization are
	 * removed, when the components that hold them exist, and the account last. A caller cannot remove
	 * itself here, it removes its own account as the signed in account, which needs a recent sign in.
	 * @param email The email address of the user to remove, or the account id.
	 * @returns A promise that resolves when the user account has been removed and the audit entry recorded.
	 * @throws ForbiddenError when the caller is the user.
	 */
	public async remove(email: string): Promise<void> {
		Guards.stringValue(EntityStorageAuthenticationAdminService.CLASS_NAME, nameof(email), email);

		try {
			const user = await this.findUser(email);
			if ((await this.callerAccountId()) === user.accountId) {
				throw new ForbiddenError(
					EntityStorageAuthenticationAdminService.CLASS_NAME,
					"removeSelfNotPermitted"
				);
			}
			await this.guardEscalatedPrivilegeTarget(user.accountId);

			await AccountHelper.removeAccount(
				this._userEntityStorage,
				this._passwordResetEntityStorage,
				this.getAccountAdmin(),
				ComponentFactory.getIfExists<IOrganizationRequestAdminComponent>(
					this._organizationRequestAdminComponentType
				),
				user.accountId,
				{ component: this._authorizationComponent, modelId: this._authorizationModelId }
			);

			await this.audit(AuthAuditEvent.AccountDeleted, user);
		} catch (error) {
			if (this.isPassThroughError(error)) {
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
	 * Set the user's password as an override, ending its sessions and removing its password reset
	 * tokens. The current password is not needed. A caller cannot set its own password here, it
	 * changes it through the authentication component with its current password instead.
	 * @param email The email address of the user to update, or the account id.
	 * @param newPassword The new password for the user.
	 * @returns A promise that resolves when the password has been updated.
	 * @throws ForbiddenError when the caller is the user.
	 */
	public async updatePassword(email: string, newPassword: string): Promise<void> {
		Guards.stringValue(EntityStorageAuthenticationAdminService.CLASS_NAME, nameof(email), email);
		Guards.stringValue(
			EntityStorageAuthenticationAdminService.CLASS_NAME,
			nameof(newPassword),
			newPassword
		);

		try {
			const user = await this.findUser(email);
			const callerAccountId = await this.callerAccountId();
			if (callerAccountId === user.accountId) {
				throw new ForbiddenError(
					EntityStorageAuthenticationAdminService.CLASS_NAME,
					"resetSelfPasswordNotPermitted"
				);
			}
			await this.guardEscalatedPrivilegeTarget(user.accountId);

			await PasswordHelper.updatePassword(
				this._userEntityStorage,
				this._authenticationAuditService,
				user,
				newPassword,
				undefined,
				{
					minPasswordLength: this._minPasswordLength,
					maxPasswordLength: this._maxPasswordLength
				},
				{
					requireCurrentPassword: false,
					passwordHashOptions: this._passwordHashOptions,
					passwordResetEntityStorage: this._passwordResetEntityStorage,
					actorAccountId: callerAccountId
				}
			);
		} catch (error) {
			if (this.isPassThroughError(error)) {
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
	 * Query the users of the tenant.
	 * @param email The start of the e-mail address of the users to return, all when omitted.
	 * @param exactEmail True to match the e-mail address exactly rather than as a prefix.
	 * @param authProviderId The authentication provider of the users to return, all when omitted.
	 * @param cursor The cursor to request the next page.
	 * @param limit The maximum number of users to return.
	 * @returns The users and a cursor when there are more.
	 */
	public async query(
		email?: string,
		exactEmail?: boolean,
		authProviderId?: string,
		cursor?: string,
		limit?: number
	): Promise<{
		entities: IAuthenticationUser[];
		cursor?: string;
	}> {
		try {
			const conditions: {
				property: keyof AuthenticationUser;
				value: string;
				comparison: (typeof ComparisonOperator)[keyof typeof ComparisonOperator];
			}[] = [];
			if (Is.stringValue(email)) {
				conditions.push({
					property: "email",
					value: EmailHelper.normalise(email),
					comparison:
						exactEmail === true ? ComparisonOperator.Equals : ComparisonOperator.StartsWith
				});
			}
			if (Is.stringValue(authProviderId)) {
				conditions.push({
					property: "authProviderId",
					value: authProviderId,
					comparison: ComparisonOperator.Equals
				});
			}

			const result = await this._userEntityStorage.query(
				conditions.length > 0 ? { conditions, logicalOperator: LogicalOperator.And } : undefined,
				undefined,
				[
					"accountId",
					"email",
					"authProviderId",
					"dateCreated",
					"dateLastLogin",
					"dateDisabled",
					"verified"
				],
				cursor,
				limit
			);

			return {
				entities: (result.entities as AuthenticationUser[]).map(user =>
					this.toAuthenticationUser(user)
				),
				cursor: result.cursor
			};
		} catch (error) {
			throw new GeneralError(
				EntityStorageAuthenticationAdminService.CLASS_NAME,
				"queryUsersFailed",
				undefined,
				error
			);
		}
	}

	/**
	 * Disable a user so it cannot sign in, ending its sessions and removing its password reset and
	 * verification tokens. A caller cannot disable itself.
	 * @param email The email address of the user to disable, or the account id.
	 * @returns A promise that resolves when the user has been disabled.
	 */
	public async disable(email: string): Promise<void> {
		Guards.stringValue(EntityStorageAuthenticationAdminService.CLASS_NAME, nameof(email), email);

		try {
			const user = await this.findUser(email);
			if ((await this.callerAccountId()) === user.accountId) {
				throw new ForbiddenError(
					EntityStorageAuthenticationAdminService.CLASS_NAME,
					"disableSelfNotPermitted"
				);
			}
			await this.guardEscalatedPrivilegeTarget(user.accountId);

			// The password version is moved on so the tokens already issued stay invalid once enabled,
			// and the write is refused when a concurrent change won, which is then made again on top.
			const disabled = await AccountHelper.disable(this._userEntityStorage, user);

			if (Is.object(this._passwordResetEntityStorage)) {
				await PasswordResetHelper.removeForAccount(
					this._passwordResetEntityStorage,
					user.accountId,
					"all"
				);
			}

			if (Is.object<AuthenticationUser>(disabled)) {
				await this.audit(AuthAuditEvent.AccountLocked, user);
			}
		} catch (error) {
			if (this.isPassThroughError(error)) {
				throw error;
			}
			throw new GeneralError(
				EntityStorageAuthenticationAdminService.CLASS_NAME,
				"disableUserFailed",
				undefined,
				error
			);
		}
	}

	/**
	 * Enable a disabled user.
	 * @param email The email address of the user to enable, or the account id.
	 * @returns A promise that resolves when the user has been enabled.
	 */
	public async enable(email: string): Promise<void> {
		Guards.stringValue(EntityStorageAuthenticationAdminService.CLASS_NAME, nameof(email), email);

		try {
			const user = await this.findUser(email);
			await this.guardEscalatedPrivilegeTarget(user.accountId);

			if (!AccountHelper.isDisabled(user)) {
				return;
			}

			// The write is refused when a concurrent change won, which is then kept, and the account is
			// never written again once removed.
			const enabled = await AccountHelper.update(this._userEntityStorage, user, current => {
				if (!AccountHelper.isDisabled(current)) {
					return;
				}
				return {
					...current,
					dateDisabled: undefined,
					dateModified: new Date().toISOString()
				};
			});

			if (Is.object<AuthenticationUser>(enabled)) {
				await this.audit(AuthAuditEvent.AccountUnlocked, user);
			}
		} catch (error) {
			if (this.isPassThroughError(error)) {
				throw error;
			}
			throw new GeneralError(
				EntityStorageAuthenticationAdminService.CLASS_NAME,
				"enableUserFailed",
				undefined,
				error
			);
		}
	}

	/**
	 * Ensure the caller holds escalated privilege when the target account holds it. Roles are held
	 * by account ids.
	 * @param accountId The account being modified.
	 * @returns A promise that resolves when the caller may modify the account.
	 * @throws ForbiddenError if the target holds escalated privilege and the caller does not.
	 * @internal
	 */
	private async guardEscalatedPrivilegeTarget(accountId: string): Promise<void> {
		if (
			Is.empty(this._authorizationComponent) ||
			!(await this._authorizationComponent.hasRoleForSubject(
				this._authorizationModelId,
				accountId,
				this._escalatedPrivilegeRole
			))
		) {
			return;
		}

		const callerAccountId = await this.callerAccountId();
		// A call with no caller account, such as from the node CLI, is a system call.
		const callerIsEscalated =
			!Is.stringValue(callerAccountId) ||
			(await this._authorizationComponent.hasRoleForSubject(
				this._authorizationModelId,
				callerAccountId,
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

	/**
	 * Find an account of any provider by its account id or e-mail address, preferring the password
	 * account for an e-mail address.
	 * @param emailOrAccountId The e-mail address or the account id.
	 * @returns The account.
	 * @throws NotFoundError when there is no account.
	 * @throws ConflictError when there is no password account and more than one other provider holds
	 * an account for the e-mail address.
	 * @internal
	 */
	private async findUser(emailOrAccountId: string): Promise<AuthenticationUser> {
		// Account ids never hold an @, so an e-mail address is not looked up as one.
		if (!emailOrAccountId.includes("@")) {
			const byId = await this._userEntityStorage.get(emailOrAccountId);
			if (Is.object<AuthenticationUser>(byId)) {
				return byId;
			}
		}

		const limit = EntityStorageAuthenticationAdminService._FIND_USER_LIMIT;
		const users = await AccountHelper.findAllByEmail(
			this._userEntityStorage,
			emailOrAccountId,
			limit
		);

		// The password account is used first, as e-mail addresses identify password accounts.
		let passwordUser = users.find(
			user => user.authProviderId === EntityStorageAuthenticationAdminService.AUTH_PROVIDER_ID
		);
		// The password account may be beyond the page, or held under the address as given when other
		// providers hold the normalised address.
		if (
			!Is.object<AuthenticationUser>(passwordUser) &&
			(users.length >= limit ||
				(users.length > 0 && emailOrAccountId.trim() !== EmailHelper.normalise(emailOrAccountId)))
		) {
			passwordUser = await AccountHelper.findByEmail(
				this._userEntityStorage,
				EntityStorageAuthenticationAdminService.AUTH_PROVIDER_ID,
				emailOrAccountId
			);
		}
		if (Is.object<AuthenticationUser>(passwordUser)) {
			return passwordUser;
		}

		if (users.length > 1) {
			throw new ConflictError(
				EntityStorageAuthenticationAdminService.CLASS_NAME,
				"multipleAccounts",
				emailOrAccountId
			);
		}
		if (!Is.object<AuthenticationUser>(users[0])) {
			throw new NotFoundError(
				EntityStorageAuthenticationAdminService.CLASS_NAME,
				"userNotFound",
				emailOrAccountId
			);
		}
		return users[0];
	}

	/**
	 * Get the account data admin component, when it exists.
	 * @returns The component.
	 * @internal
	 */
	private getAccountAdmin(): IAuthenticationAccountAdminComponent | undefined {
		return ComponentFactory.getIfExists<IAuthenticationAccountAdminComponent>(
			this._authenticationAccountAdminComponentType
		);
	}

	/**
	 * Get the identity and organization of an account from its account data.
	 * @param accountId The account id.
	 * @returns The identity and organization, when the account has them.
	 * @internal
	 */
	private async accountContext(
		accountId: string
	): Promise<Pick<IAuthenticationUser, "userIdentity" | "organizationIdentity">> {
		const accountAdmin = this.getAccountAdmin();
		if (Is.empty(accountAdmin)) {
			return {};
		}
		const [identity, organization] = await Promise.all([
			this.defaultItem(accountAdmin, accountId, AuthenticationAccountDataType.Identity),
			this.defaultItem(accountAdmin, accountId, AuthenticationAccountDataType.Organization)
		]);
		return {
			userIdentity: AuthenticationAccountHelper.getIdentity(identity?.data),
			organizationIdentity: AuthenticationAccountHelper.getOrganization(organization?.data)
		};
	}

	/**
	 * Get the item of a type to use first for an account.
	 * @param accountAdmin The account data admin component.
	 * @param accountId The account id.
	 * @param type The type of the item.
	 * @returns The default item, otherwise the first, or undefined when there is none.
	 * @internal
	 */
	private async defaultItem(
		accountAdmin: IAuthenticationAccountAdminComponent,
		accountId: string,
		type: string
	): Promise<IAuthenticationAccountData | undefined> {
		let first: IAuthenticationAccountData | undefined;
		let cursor: string | undefined;
		do {
			const page = await accountAdmin.query(accountId, type, cursor);
			const match = page.entities.find(item => item.isDefault);
			if (Is.object(match)) {
				return match;
			}
			first ??= page.entities[0];
			cursor = page.cursor;
		} while (Is.stringValue(cursor));
		return first;
	}

	/**
	 * Replace the identity of an account, an account holds only one. The previous identity is put
	 * back when the new one cannot be stored.
	 * @param accountAdmin The account data admin component.
	 * @param accountId The account id.
	 * @param identity The DID.
	 * @returns True when the identity changed.
	 * @internal
	 */
	private async replaceIdentity(
		accountAdmin: IAuthenticationAccountAdminComponent,
		accountId: string,
		identity: string
	): Promise<boolean> {
		const current = await this.defaultItem(
			accountAdmin,
			accountId,
			AuthenticationAccountDataType.Identity
		);
		if (AuthenticationAccountHelper.getIdentity(current?.data) === identity) {
			return false;
		}
		if (Is.object(current)) {
			await accountAdmin.remove(current.id);
		}
		try {
			await accountAdmin.create(
				accountId,
				AuthenticationAccountDataType.Identity,
				AuthenticationAccountHelper.createIdentityData(identity),
				true
			);
		} catch (error) {
			if (Is.object(current)) {
				// The caller was allowed to remove it, so it is put back as the system.
				await AccountHelper.runAsSystem(async () =>
					accountAdmin.create(accountId, AuthenticationAccountDataType.Identity, current.data, true)
				);
			}
			throw error;
		}
		return true;
	}

	/**
	 * Get the account of the caller.
	 * @returns The account id, or undefined for a system call.
	 * @internal
	 */
	private async callerAccountId(): Promise<string | undefined> {
		const contextIds = await ContextIdStore.getContextIds();
		return contextIds?.[ContextIdKeys.Account];
	}

	/**
	 * Record an admin action, the caller is the actor and the account it acted on is in the data.
	 * @param event The event.
	 * @param user The account acted on.
	 * @param data Additional data.
	 * @returns A promise that resolves when the audit entry has been recorded.
	 * @internal
	 */
	private async audit(
		event: AuthAuditEvent,
		user: AuthenticationUser,
		data?: { [key: string]: unknown }
	): Promise<void> {
		const contextIds = await ContextIdStore.getContextIds();
		const actorAccountId = contextIds?.[ContextIdKeys.Account];
		await this._authenticationAuditService?.create({
			// A system call keeps the e-mail address of the account as the actor, as before.
			actorId: actorAccountId ?? user.email,
			event,
			data: {
				...data,
				accountId: user.accountId,
				email: user.email,
				actorAccountId,
				tenantId: contextIds?.[ContextIdKeys.Tenant],
				originalTenantId: contextIds?.[HttpContextIdKeys.OriginalTenant]
			}
		});
	}

	/**
	 * Check whether an error is returned to the caller as it is.
	 * @param error The error.
	 * @returns True for forbidden and conflict errors.
	 * @internal
	 */
	private isPassThroughError(error: unknown): boolean {
		return (
			BaseError.isErrorName(error, ForbiddenError.CLASS_NAME) ||
			BaseError.isErrorName(error, ConflictError.CLASS_NAME)
		);
	}

	/**
	 * Map a stored account to the admin response.
	 * @param user The stored account.
	 * @returns The account fields returned to callers.
	 * @internal
	 */
	private toAuthenticationUser(user: AuthenticationUser): IAuthenticationUser {
		return {
			email: user.email,
			accountId: user.accountId,
			authProviderId: user.authProviderId,
			dateCreated: user.dateCreated,
			dateLastLogin: user.dateLastLogin,
			dateDisabled: user.dateDisabled,
			disabled: AccountHelper.isDisabled(user),
			verified: user.verified !== false
		};
	}
}
