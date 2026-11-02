// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import {
	AuthenticationAccountDataType,
	AuthenticationAccountHelper,
	ExportFileHelper,
	ExportFileType,
	type IAccountIdentityExport,
	type IAccountIdentityImportResult,
	type IAccountProfileExport,
	type IAccountProfileImportResult,
	type IAuthenticationAccountAdminComponent,
	type IAuthenticationAccountData,
	RecentSignInHelper
} from "@3sixty/api-auth-models";
import { ForbiddenError } from "@3sixty/api-models";
import type { IAuthorizationComponent } from "@3sixty/authorization-models";
import {
	BaseError,
	ComponentFactory,
	ConflictError,
	GeneralError,
	Guards,
	Is,
	Mutex,
	NotFoundError,
	UnauthorizedError,
	UnprocessableError
} from "@3sixty/core";
import { ComparisonOperator } from "@3sixty/entity";
import {
	EntityStorageConnectorFactory,
	type IEntityStorageConnector
} from "@3sixty/entity-storage-models";
import type { IIdentityComponent } from "@3sixty/identity-models";
import type { ILoggingComponent } from "@3sixty/logging-models";
import { nameof } from "@3sixty/nameof";
import type { IProof } from "@3sixty/standards-w3c-did";
import { EntityStorageAuthenticationAccountService } from "./entityStorageAuthenticationAccountService.js";
import type { AccountData } from "../entities/accountData.js";
import type { Organization } from "../entities/organization.js";
import type { OrganizationRequest } from "../entities/organizationRequest.js";
import type { IEntityStorageAuthenticationAccountAdminServiceConstructorOptions } from "../models/IEntityStorageAuthenticationAccountAdminServiceConstructorOptions.js";
import { AccountDataHelper } from "../utils/accountDataHelper.js";
import { AdminScopeHelper } from "../utils/adminScopeHelper.js";
import { IdentityProofHelper } from "../utils/identityProofHelper.js";
import { MembershipRemovalHelper } from "../utils/membershipRemovalHelper.js";
import { OrganizationAdminRoles } from "../utils/organizationAdminRoles.js";
import { OrganizationHelper } from "../utils/organizationHelper.js";
import { PendingMembershipHelper } from "../utils/pendingMembershipHelper.js";

/**
 * Manages the data of the accounts of the tenant using entity storage. Callers holding escalated
 * privilege manage every account, other callers only the members of the organizations they are an
 * org admin of, other accounts are reported as missing. Accounts holding escalated privilege, and
 * the identity and organization of the caller's own account, are only changed by callers holding
 * escalated privilege.
 */
export class EntityStorageAuthenticationAccountAdminService implements IAuthenticationAccountAdminComponent {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string =
		nameof<EntityStorageAuthenticationAccountAdminService>();

	/**
	 * The default role that grants escalated privilege.
	 */
	public static readonly DEFAULT_ESCALATED_PRIVILEGE_ROLE: string = "global-admin";

	/**
	 * The default authorization model ID used to look up roles.
	 */
	public static readonly DEFAULT_AUTHORIZATION_MODEL_ID: string = "system";

	/**
	 * The default roles a caller holding escalated privilege may always grant and revoke.
	 */
	public static readonly DEFAULT_ASSIGNABLE_ROLES: string[] = ["user-admin"];

	/**
	 * The types that grant an account its identity and organization.
	 * @internal
	 */
	private static readonly _CONTEXT_TYPES: string[] = [
		AuthenticationAccountDataType.Identity,
		AuthenticationAccountDataType.Organization
	];

	/**
	 * The entity storage for account data.
	 * @internal
	 */
	private readonly _accountDataEntityStorage: IEntityStorageConnector<AccountData>;

	/**
	 * The entity storage for the registered organizations.
	 * @internal
	 */
	private readonly _organizationEntityStorage: IEntityStorageConnector<Organization>;

	/**
	 * The authorization component used to guard accounts with escalated privilege.
	 * @internal
	 */
	private readonly _authorizationComponent: IAuthorizationComponent;

	/**
	 * The identity component.
	 * @internal
	 */
	private readonly _identityComponent: IIdentityComponent;

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
	 * How long an identity proof may be used for after it was created, in seconds.
	 * @internal
	 */
	private readonly _identityProofMaxAgeSeconds: number;

	/**
	 * The verification method of the organization that signs the membership credential.
	 * @internal
	 */
	private readonly _verificationMethodId: string;

	/**
	 * The entity storage for the requests to join an organization.
	 * @internal
	 */
	private readonly _organizationRequestEntityStorage: IEntityStorageConnector<OrganizationRequest>;

	/**
	 * The entity storage for the users, which an account id must belong to.
	 * @internal
	 */
	private readonly _userEntityStorage: IEntityStorageConnector<{ accountId: string }>;

	/**
	 * The logging component, when it exists.
	 * @internal
	 */
	private readonly _logging?: ILoggingComponent;

	/**
	 * How long ago the session of the caller may have started for exporting an identity, in seconds.
	 * @internal
	 */
	private readonly _recentSignInSeconds: number;

	/**
	 * The account service that exports and imports the account data, as the account does itself,
	 * with the storage and components of this service.
	 * @internal
	 */
	private readonly _accountService: EntityStorageAuthenticationAccountService;

	/**
	 * The org admin roles of the organizations, which decide the accounts a caller manages.
	 * @internal
	 */
	private readonly _adminRoles: OrganizationAdminRoles;

	/**
	 * The roles a caller holding escalated privilege may always grant and revoke.
	 * @internal
	 */
	private readonly _assignableRoles: string[];

	/**
	 * Create a new instance of EntityStorageAuthenticationAccountAdminService.
	 * @param options The options for the service.
	 */
	constructor(options?: IEntityStorageAuthenticationAccountAdminServiceConstructorOptions) {
		this._accountDataEntityStorage = EntityStorageConnectorFactory.get(
			options?.accountDataEntityStorageType ?? "account-data"
		);
		this._authorizationComponent = ComponentFactory.get<IAuthorizationComponent>(
			options?.authorizationComponentType ?? "authorization"
		);
		this._organizationEntityStorage = EntityStorageConnectorFactory.get(
			options?.organizationEntityStorageType ?? "organization"
		);
		this._identityComponent = ComponentFactory.get<IIdentityComponent>(
			options?.identityComponentType ?? "identity-service"
		);
		this._escalatedPrivilegeRole =
			options?.config?.escalatedPrivilegeRole ??
			EntityStorageAuthenticationAccountAdminService.DEFAULT_ESCALATED_PRIVILEGE_ROLE;
		this._authorizationModelId =
			options?.config?.authorizationModelId ??
			EntityStorageAuthenticationAccountAdminService.DEFAULT_AUTHORIZATION_MODEL_ID;
		this._identityProofMaxAgeSeconds =
			options?.config?.identityProofMaxAgeSeconds ?? IdentityProofHelper.DEFAULT_MAX_AGE_SECONDS;
		this._verificationMethodId =
			options?.config?.verificationMethodId ??
			EntityStorageAuthenticationAccountService.DEFAULT_VERIFICATION_METHOD_ID;
		this._organizationRequestEntityStorage = EntityStorageConnectorFactory.get<
			IEntityStorageConnector<OrganizationRequest>
		>(options?.organizationRequestEntityStorageType ?? "organization-request");
		this._userEntityStorage = EntityStorageConnectorFactory.get<
			IEntityStorageConnector<{ accountId: string }>
		>(options?.userEntityStorageType ?? "authentication-user");
		this._logging = ComponentFactory.getIfExists<ILoggingComponent>(
			options?.loggingComponentType ?? "logging"
		);
		this._recentSignInSeconds =
			options?.config?.recentSignInSeconds ?? RecentSignInHelper.DEFAULT_MAX_AGE_SECONDS;
		this._accountService = new EntityStorageAuthenticationAccountService({
			accountDataEntityStorageType: options?.accountDataEntityStorageType,
			organizationEntityStorageType: options?.organizationEntityStorageType,
			organizationRequestEntityStorageType: options?.organizationRequestEntityStorageType,
			identityComponentType: options?.identityComponentType,
			authenticationRateServiceType: options?.authenticationRateServiceType,
			authorizationComponentType: options?.authorizationComponentType,
			loggingComponentType: options?.loggingComponentType,
			config: {
				verificationMethodId: options?.config?.verificationMethodId,
				identityProofMaxAgeSeconds: options?.config?.identityProofMaxAgeSeconds,
				authorizationModelId: options?.config?.authorizationModelId,
				organizationAdminRolePrefix: options?.config?.organizationAdminRolePrefix
			}
		});
		this._adminRoles = new OrganizationAdminRoles(
			this._authorizationComponent,
			this._authorizationModelId,
			options?.config?.organizationAdminRolePrefix
		);
		this._assignableRoles =
			options?.config?.assignableRoles ??
			EntityStorageAuthenticationAccountAdminService.DEFAULT_ASSIGNABLE_ROLES;
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return EntityStorageAuthenticationAccountAdminService.CLASS_NAME;
	}

	/**
	 * Store an item for an account. An organization is stored with a membership credential, issued
	 * when the account binds an identity if it has none yet. An avatar replaces the avatar of the
	 * account, which stays the default.
	 * @param accountId The account to store the item for.
	 * @param type The type of the item.
	 * @param data The value of the item.
	 * @param isDefault True to use the item first for its type, clearing any other default.
	 * @param proof A proof by the DID over the identity proof document, required when a caller
	 * without escalated privilege stores an identity.
	 * @param adminOnly True when only admins may see and change the item.
	 * @returns The unique identifier of the item.
	 * @throws ConflictError when an identity is stored for an account that has one, or a DID held by
	 * an account, the node or an organization.
	 * @throws ForbiddenError when the identity or organization of an escalated account, or of the
	 * caller's own account, is set by a caller without escalated privilege, or an admin replaces an
	 * avatar owned by the authentication provider.
	 * @throws UnauthorizedError when a required identity proof does not verify.
	 * @throws NotFoundError when an organization is not registered.
	 * @throws UnprocessableError when the account is a registered organization, whose profiles are
	 * changed through the organization service, or the value is not valid for the type.
	 * @throws NotFoundError when the caller does not manage the account.
	 */
	public async create(
		accountId: string,
		type: string,
		data: unknown,
		isDefault?: boolean,
		proof?: IProof,
		adminOnly?: boolean
	): Promise<string> {
		Guards.stringValue(
			EntityStorageAuthenticationAccountAdminService.CLASS_NAME,
			nameof(accountId),
			accountId
		);
		// Variants such as "Identity" are normalised, so the handling below can not be skipped.
		type = AccountDataHelper.normaliseType(type);
		const callerIsEscalated = AdminScopeHelper.callerIsEscalatedOnce(
			this._authorizationComponent,
			this._authorizationModelId,
			this._escalatedPrivilegeRole
		);
		await this.guardMigrationType(type, callerIsEscalated);
		await this.guardManaged(accountId, callerIsEscalated);
		await this.guardOrganizationProfile(accountId);

		AccountDataHelper.validateData(type, data);

		const identity = AuthenticationAccountHelper.getIdentity(data);
		if (type === AuthenticationAccountDataType.Identity && Is.stringValue(identity)) {
			await this.guardContextChange(accountId, callerIsEscalated);
			return this.storeIdentity(accountId, identity, callerIsEscalated, proof);
		}

		const organization = AuthenticationAccountHelper.getOrganization(data);
		if (type === AuthenticationAccountDataType.Organization && Is.stringValue(organization)) {
			await this.guardContextChange(accountId, callerIsEscalated);
			await OrganizationHelper.guardRegistered(this._organizationEntityStorage, organization);
			return PendingMembershipHelper.add(
				this._accountDataEntityStorage,
				this._organizationEntityStorage,
				this._identityComponent,
				this._verificationMethodId,
				accountId,
				organization,
				isDefault
			);
		}

		// An account holds one avatar, so a new one replaces it.
		if (type === AuthenticationAccountDataType.Avatar) {
			const avatars = await AccountDataHelper.queryAll(
				this._accountDataEntityStorage,
				accountId,
				type
			);
			for (const item of avatars) {
				await this.guardProviderAvatar(item);
			}
			return AccountDataHelper.replaceAvatar(
				this._accountDataEntityStorage,
				accountId,
				data,
				avatars
			);
		}

		return AccountDataHelper.create(
			this._accountDataEntityStorage,
			accountId,
			type,
			data,
			isDefault,
			undefined,
			{ adminOnly }
		);
	}

	/**
	 * Create a self-controlled identity with keys the node holds for an account that has none, as
	 * the account does itself.
	 * @param accountId The account.
	 * @returns The DID of the account.
	 * @throws UnprocessableError when the account is a registered organization.
	 * @throws NotFoundError when the account does not exist.
	 * @throws ForbiddenError when the account holds escalated privilege, or is the caller's own, and
	 * the caller does not hold escalated privilege.
	 * @throws ConflictError when the account already has an identity.
	 */
	public async createIdentity(accountId: string): Promise<string> {
		Guards.stringValue(
			EntityStorageAuthenticationAccountAdminService.CLASS_NAME,
			nameof(accountId),
			accountId
		);
		const callerIsEscalated = AdminScopeHelper.callerIsEscalatedOnce(
			this._authorizationComponent,
			this._authorizationModelId,
			this._escalatedPrivilegeRole
		);
		await this.guardManaged(accountId, callerIsEscalated);
		await this.guardOrganizationProfile(accountId);
		await this.guardUser(accountId);
		await this.guardContextChange(accountId, callerIsEscalated);
		return this._accountService.createAccountIdentity(accountId);
	}

	/**
	 * Export the identity of an account with its private keys and the credentials it holds, as the
	 * account does itself. The caller must have signed in recently, as the keys leave the node, a
	 * system call such as from the node CLI has no session.
	 * @param accountId The account.
	 * @param sessionStart When the session of the caller started in seconds, it must be recent.
	 * @returns The export, which contains private keys and must be protected.
	 * @throws ForbiddenError when the account holds escalated privilege and the caller does not.
	 * @throws UnauthorizedError when the session did not start recently.
	 * @throws NotFoundError when the account does not exist or has no identity.
	 * @throws UnprocessableError when the node does not hold the keys of the identity, or the account
	 * is a registered organization.
	 */
	public async exportIdentity(
		accountId: string,
		sessionStart?: number
	): Promise<IAccountIdentityExport> {
		Guards.stringValue(
			EntityStorageAuthenticationAccountAdminService.CLASS_NAME,
			nameof(accountId),
			accountId
		);
		const callerIsEscalated = AdminScopeHelper.callerIsEscalatedOnce(
			this._authorizationComponent,
			this._authorizationModelId,
			this._escalatedPrivilegeRole
		);
		await this.guardManaged(accountId, callerIsEscalated);
		await this.guardOrganizationProfile(accountId);
		await this.guardUser(accountId);
		await this.guardEscalatedTarget(accountId, callerIsEscalated);
		if (Is.stringValue(await AdminScopeHelper.callerAccount())) {
			RecentSignInHelper.guard(sessionStart, this._recentSignInSeconds);
		}
		return this._accountService.exportAccountIdentity(accountId);
	}

	/**
	 * Import a self-controlled identity into an account that has none, as the account does itself.
	 * The type of the file is checked before anything else.
	 * @param accountId The account.
	 * @param exported The account identity export file.
	 * @returns The DID and what was imported.
	 * @throws UnprocessableError when the file is not an account identity export or is not valid, or
	 * the account is a registered organization.
	 * @throws NotFoundError when the account does not exist.
	 * @throws ForbiddenError when the account holds escalated privilege, or is the caller's own, and
	 * the caller does not hold escalated privilege.
	 * @throws ConflictError when the account already has an identity, or the DID is held.
	 */
	public async importIdentity(
		accountId: string,
		exported: IAccountIdentityExport
	): Promise<IAccountIdentityImportResult> {
		ExportFileHelper.guard(exported, ExportFileType.AccountIdentity);
		Guards.stringValue(
			EntityStorageAuthenticationAccountAdminService.CLASS_NAME,
			nameof(accountId),
			accountId
		);
		const callerIsEscalated = AdminScopeHelper.callerIsEscalatedOnce(
			this._authorizationComponent,
			this._authorizationModelId,
			this._escalatedPrivilegeRole
		);
		await this.guardManaged(accountId, callerIsEscalated);
		await this.guardOrganizationProfile(accountId);
		await this.guardUser(accountId);
		await this.guardContextChange(accountId, callerIsEscalated);
		return this._accountService.importAccountIdentity(accountId, exported);
	}

	/**
	 * Export the account data of an account, as the account does itself.
	 * @param accountId The account.
	 * @returns The export.
	 * @throws NotFoundError when the account does not exist.
	 * @throws ForbiddenError when the account holds escalated privilege and the caller does not.
	 * @throws UnprocessableError when the account is a registered organization.
	 */
	public async exportProfile(accountId: string): Promise<IAccountProfileExport> {
		Guards.stringValue(
			EntityStorageAuthenticationAccountAdminService.CLASS_NAME,
			nameof(accountId),
			accountId
		);
		const callerIsEscalated = AdminScopeHelper.callerIsEscalatedOnce(
			this._authorizationComponent,
			this._authorizationModelId,
			this._escalatedPrivilegeRole
		);
		await this.guardManaged(accountId, callerIsEscalated);
		await this.guardOrganizationProfile(accountId);
		await this.guardUser(accountId);
		await this.guardEscalatedTarget(accountId, callerIsEscalated);
		return this._accountService.exportAccountProfile(accountId);
	}

	/**
	 * Replace the account data of an account with an export, as the account does itself. The type of
	 * the file is checked before anything else.
	 * @param accountId The account.
	 * @param profile The account profile export file.
	 * @returns What was imported and removed.
	 * @throws UnprocessableError when the file is not an account profile export or is not valid, or
	 * the account is a registered organization.
	 * @throws NotFoundError when the account does not exist.
	 * @throws ForbiddenError when the account holds escalated privilege and the caller does not.
	 */
	public async importProfile(
		accountId: string,
		profile: IAccountProfileExport
	): Promise<IAccountProfileImportResult> {
		ExportFileHelper.guard(profile, ExportFileType.AccountProfile);
		Guards.stringValue(
			EntityStorageAuthenticationAccountAdminService.CLASS_NAME,
			nameof(accountId),
			accountId
		);
		const callerIsEscalated = AdminScopeHelper.callerIsEscalatedOnce(
			this._authorizationComponent,
			this._authorizationModelId,
			this._escalatedPrivilegeRole
		);
		await this.guardManaged(accountId, callerIsEscalated);
		await this.guardOrganizationProfile(accountId);
		await this.guardUser(accountId);
		await this.guardEscalatedTarget(accountId, callerIsEscalated);
		return this._accountService.importAccountProfile(accountId, profile);
	}

	/**
	 * Get an item.
	 * @param id The unique identifier of the item.
	 * @returns The item.
	 * @throws NotFoundError when the item does not exist, or the caller does not manage its account.
	 */
	public async get(id: string): Promise<IAuthenticationAccountData> {
		const item = await AccountDataHelper.get(this._accountDataEntityStorage, id);
		await this.guardManagedItem(
			item,
			AdminScopeHelper.callerIsEscalatedOnce(
				this._authorizationComponent,
				this._authorizationModelId,
				this._escalatedPrivilegeRole
			)
		);
		return item;
	}

	/**
	 * Replace the value of an item.
	 * @param id The unique identifier of the item.
	 * @param data The new value of the item.
	 * @param isDefault True to use the item first for its type, clearing any other default, unchanged when omitted.
	 * @param adminOnly True when only admins may see and change the item, unchanged when omitted.
	 * @returns A promise that resolves when the item has been updated.
	 * @throws NotFoundError when the item does not exist, or the caller does not manage its account.
	 * @throws UnprocessableError when the DID of an identity or an organization is changed, remove
	 * it and create another.
	 * @throws ForbiddenError when the identity or organization of an escalated account, or of the
	 * caller's own account, is changed by a caller without escalated privilege, or an admin
	 * changes an avatar owned by the authentication provider.
	 */
	public async update(
		id: string,
		data: unknown,
		isDefault?: boolean,
		adminOnly?: boolean
	): Promise<void> {
		const callerIsEscalated = AdminScopeHelper.callerIsEscalatedOnce(
			this._authorizationComponent,
			this._authorizationModelId,
			this._escalatedPrivilegeRole
		);
		const item = await AccountDataHelper.get(this._accountDataEntityStorage, id);
		await this.guardMigrationType(item.type, callerIsEscalated);
		await this.guardManagedItem(item, callerIsEscalated);
		await this.guardOrganizationProfile(item.accountId);
		await this.guardProviderAvatar(item);
		if (
			AccountDataHelper.isType(
				item.type,
				...EntityStorageAuthenticationAccountAdminService._CONTEXT_TYPES
			)
		) {
			await this.guardContextChange(item.accountId, callerIsEscalated);
			AccountDataHelper.validateData(item.type, data);
			// The id of an identity item is derived from its DID, and an organization is held with its
			// membership credential, so neither DID can change.
			const isIdentity = AccountDataHelper.isType(
				item.type,
				AuthenticationAccountDataType.Identity
			);
			const [current, next] = isIdentity
				? [
						AuthenticationAccountHelper.getIdentity(item.data),
						AuthenticationAccountHelper.getIdentity(data)
					]
				: [
						AuthenticationAccountHelper.getOrganization(item.data),
						AuthenticationAccountHelper.getOrganization(data)
					];
			if (current !== next) {
				throw new UnprocessableError(
					EntityStorageAuthenticationAccountAdminService.CLASS_NAME,
					isIdentity ? "identityImmutable" : "organizationImmutable"
				);
			}
		}
		await AccountDataHelper.updateItem(
			this._accountDataEntityStorage,
			item,
			data,
			isDefault,
			adminOnly
		);
	}

	/**
	 * Remove an item. Removing an organization removes the account from it, revoking the membership
	 * credential the node issued and removing the membership credentials of the organization the
	 * account holds. Removing an identity removes it as the account would, with the keys the node
	 * holds for it, the credentials, organizations and pending requests to join one.
	 * @param id The unique identifier of the item.
	 * @returns A promise that resolves when the item has been removed.
	 * @throws NotFoundError when the item does not exist, or the caller does not manage its account.
	 * @throws ForbiddenError when the identity or organization of an escalated account, or of the
	 * caller's own account, is removed by a caller without escalated privilege, or an admin
	 * removes an avatar owned by the authentication provider.
	 * @throws GeneralError when the node holds the keys of an identity and removing them fails.
	 */
	public async remove(id: string): Promise<void> {
		const callerIsEscalated = AdminScopeHelper.callerIsEscalatedOnce(
			this._authorizationComponent,
			this._authorizationModelId,
			this._escalatedPrivilegeRole
		);
		const item = await AccountDataHelper.get(this._accountDataEntityStorage, id);
		await this.guardMigrationType(item.type, callerIsEscalated);
		await this.guardManagedItem(item, callerIsEscalated);
		await this.guardOrganizationProfile(item.accountId);
		await this.guardProviderAvatar(item);
		if (
			AccountDataHelper.isType(
				item.type,
				...EntityStorageAuthenticationAccountAdminService._CONTEXT_TYPES
			)
		) {
			await this.guardContextChange(item.accountId, callerIsEscalated);
		}

		const organization = AuthenticationAccountHelper.getOrganization(item.data);
		if (
			AccountDataHelper.isType(item.type, AuthenticationAccountDataType.Organization) &&
			Is.stringValue(organization)
		) {
			await MembershipRemovalHelper.leave(
				this._accountDataEntityStorage,
				this._identityComponent,
				this._adminRoles,
				item.accountId,
				organization
			);
			return;
		}

		const identity = AuthenticationAccountHelper.getIdentity(item.data);
		if (
			AccountDataHelper.isType(item.type, AuthenticationAccountDataType.Identity) &&
			Is.stringValue(identity)
		) {
			const lockKey = AccountDataHelper.identityLockKey(item.accountId);
			await Mutex.lock(lockKey, { throwOnTimeout: true });
			try {
				await this.removeNodeIdentity(identity);
				await MembershipRemovalHelper.removeAll(
					this._accountDataEntityStorage,
					this._organizationRequestEntityStorage,
					this._identityComponent,
					this._adminRoles,
					item.accountId
				);
			} finally {
				Mutex.unlock(lockKey);
			}
			return;
		}

		await AccountDataHelper.removeItem(this._accountDataEntityStorage, item);
	}

	/**
	 * Query the items of the accounts the caller manages.
	 * @param accountId The account of the items to return, all accounts the caller manages when omitted.
	 * @param type The type of the items to return, all types when omitted.
	 * @param cursor The cursor to request the next page.
	 * @param limit The maximum number of items to return.
	 * @returns The items and a cursor when there are more.
	 */
	public async query(
		accountId?: string,
		type?: string,
		cursor?: string,
		limit?: number
	): Promise<{
		entities: IAuthenticationAccountData[];
		cursor?: string;
	}> {
		const managed = await this.getManagedAccounts();
		let accounts: string | string[] | undefined = accountId;
		if (Is.array(managed)) {
			accounts = Is.stringValue(accountId)
				? managed.filter(managedId => managedId === accountId)
				: managed;
			if (accounts.length === 0) {
				return { entities: [] };
			}
		}
		// The node migration records are kept out of listings unless asked for by type.
		return AccountDataHelper.query(this._accountDataEntityStorage, accounts, type, cursor, limit, [
			EntityStorageAuthenticationAccountService.MIGRATION_TYPE
		]);
	}

	/**
	 * Get the accounts the caller may manage, callers without escalated privilege only manage the
	 * members of the organizations they are an org admin of.
	 * @returns The account ids, or undefined when the caller may manage every account.
	 */
	public async getManagedAccounts(): Promise<string[] | undefined> {
		return AdminScopeHelper.managedAccounts(
			this._accountDataEntityStorage,
			this._adminRoles,
			AdminScopeHelper.callerIsEscalatedOnce(
				this._authorizationComponent,
				this._authorizationModelId,
				this._escalatedPrivilegeRole
			)
		);
	}

	/**
	 * Get the roles of an account the caller manages.
	 * @param accountId The account.
	 * @returns The roles.
	 * @throws NotFoundError when the caller does not manage the account.
	 */
	public async getRoles(accountId: string): Promise<string[]> {
		Guards.stringValue(
			EntityStorageAuthenticationAccountAdminService.CLASS_NAME,
			nameof(accountId),
			accountId
		);
		await this.guardManaged(
			accountId,
			AdminScopeHelper.callerIsEscalatedOnce(
				this._authorizationComponent,
				this._authorizationModelId,
				this._escalatedPrivilegeRole
			)
		);
		return this._authorizationComponent.getRolesForSubject(this._authorizationModelId, accountId);
	}

	/**
	 * Get the roles the caller may grant and revoke, for a caller holding escalated privilege every
	 * role in use, the escalated privilege role and the configured assignable roles, otherwise the roles it holds other than the escalated privilege role. The org admin
	 * roles are never included, they are managed through the organization.
	 * @returns The roles.
	 */
	public async getAssignableRoles(): Promise<string[]> {
		const callerIsEscalated = AdminScopeHelper.callerIsEscalatedOnce(
			this._authorizationComponent,
			this._authorizationModelId,
			this._escalatedPrivilegeRole
		);
		const roles = new Set<string>();
		if (await callerIsEscalated()) {
			// The roles in use may not include the roles no account holds yet.
			roles.add(this._escalatedPrivilegeRole);
			for (const role of this._assignableRoles) {
				roles.add(role);
			}
			let cursor: string | undefined;
			do {
				const page = await this._authorizationComponent.getAllRoles(
					this._authorizationModelId,
					cursor
				);
				for (const role of page.roles) {
					roles.add(role);
				}
				cursor = page.cursor;
			} while (Is.stringValue(cursor));
		} else {
			const callerAccountId = await AdminScopeHelper.callerAccount();
			const held = Is.stringValue(callerAccountId)
				? await this._authorizationComponent.getRolesForSubject(
						this._authorizationModelId,
						callerAccountId
					)
				: [];
			for (const role of held) {
				if (role !== this._escalatedPrivilegeRole) {
					roles.add(role);
				}
			}
		}
		return [...roles].filter(role => !this._adminRoles.isRole(role)).sort();
	}

	/**
	 * Grant a role to an account the caller manages, through the authorization component in the
	 * context of the caller, so its own escalation checks also apply.
	 * @param accountId The account.
	 * @param role The role.
	 * @returns A promise that resolves when the role has been granted.
	 * @throws NotFoundError when the caller does not manage the account.
	 * @throws ForbiddenError when the caller may not grant the role to the account.
	 * @throws UnprocessableError when the role is an org admin role.
	 */
	public async addRole(accountId: string, role: string): Promise<void> {
		await this.guardRoleChange(accountId, role);
		await this._authorizationComponent.addRoleForSubject(
			this._authorizationModelId,
			accountId,
			role
		);
	}

	/**
	 * Revoke a role of an account the caller manages, through the authorization component in the
	 * context of the caller, so its own escalation checks also apply.
	 * @param accountId The account.
	 * @param role The role.
	 * @returns A promise that resolves when the role has been revoked.
	 * @throws NotFoundError when the caller does not manage the account.
	 * @throws ForbiddenError when the caller may not revoke the role of the account.
	 * @throws UnprocessableError when the role is an org admin role.
	 * @throws ConflictError when the escalated privilege role is revoked from its last holder.
	 */
	public async removeRole(accountId: string, role: string): Promise<void> {
		await this.guardRoleChange(accountId, role);
		if (role === this._escalatedPrivilegeRole) {
			const holders = await this._authorizationComponent.getSubjectsForRole(
				this._authorizationModelId,
				role
			);
			if (holders.includes(accountId) && holders.length <= 1) {
				throw new ConflictError(
					EntityStorageAuthenticationAccountAdminService.CLASS_NAME,
					"lastEscalatedRoleHolder",
					accountId
				);
			}
		}
		await this._authorizationComponent.removeRoleForSubject(
			this._authorizationModelId,
			accountId,
			role
		);
	}

	/**
	 * Ensure the caller may grant or revoke a role of an account. A caller without escalated
	 * privilege only changes the accounts it manages that do not hold escalated privilege, never its
	 * own, and only with the roles it holds other than the escalated privilege role.
	 * @param accountId The account.
	 * @param role The role.
	 * @returns A promise that resolves when the caller may change the role.
	 * @throws NotFoundError when the caller does not manage the account.
	 * @throws ForbiddenError when the caller may not change the role.
	 * @throws UnprocessableError when the role is an org admin role.
	 * @internal
	 */
	private async guardRoleChange(accountId: string, role: string): Promise<void> {
		Guards.stringValue(
			EntityStorageAuthenticationAccountAdminService.CLASS_NAME,
			nameof(accountId),
			accountId
		);
		Guards.stringValue(
			EntityStorageAuthenticationAccountAdminService.CLASS_NAME,
			nameof(role),
			role
		);
		if (this._adminRoles.isRole(role)) {
			throw new UnprocessableError(
				EntityStorageAuthenticationAccountAdminService.CLASS_NAME,
				"organizationAdminRoleManaged",
				{ role }
			);
		}
		const callerIsEscalated = AdminScopeHelper.callerIsEscalatedOnce(
			this._authorizationComponent,
			this._authorizationModelId,
			this._escalatedPrivilegeRole
		);
		await this.guardManaged(accountId, callerIsEscalated);
		if (await callerIsEscalated()) {
			return;
		}
		if ((await AdminScopeHelper.callerAccount()) === accountId) {
			throw new ForbiddenError(
				EntityStorageAuthenticationAccountAdminService.CLASS_NAME,
				"ownRolesNotPermitted",
				{ roleName: this._escalatedPrivilegeRole }
			);
		}
		await this.guardEscalatedTarget(accountId, callerIsEscalated);
		if (!(await this.getAssignableRoles()).includes(role)) {
			throw new ForbiddenError(
				EntityStorageAuthenticationAccountAdminService.CLASS_NAME,
				"roleNotAssignable",
				{ role }
			);
		}
	}

	/**
	 * Ensure the caller manages the account of an item, an item it does not manage is reported as
	 * missing.
	 * @param item The item.
	 * @param callerIsEscalated The check of whether the caller holds escalated privilege.
	 * @returns A promise that resolves when the caller manages the account.
	 * @throws NotFoundError when it does not.
	 * @internal
	 */
	private async guardManagedItem(
		item: IAuthenticationAccountData,
		callerIsEscalated: () => Promise<boolean>
	): Promise<void> {
		if (
			!(await AdminScopeHelper.callerManages(
				this._accountDataEntityStorage,
				this._adminRoles,
				callerIsEscalated,
				item.accountId
			))
		) {
			throw new NotFoundError(AccountDataHelper.CLASS_NAME, "accountDataNotFound", item.id);
		}
	}

	/**
	 * Ensure the caller manages an account, an account it does not manage is reported as missing.
	 * @param accountId The account.
	 * @param callerIsEscalated The check of whether the caller holds escalated privilege.
	 * @returns A promise that resolves when the caller manages the account.
	 * @throws NotFoundError when it does not.
	 * @internal
	 */
	private async guardManaged(
		accountId: string,
		callerIsEscalated: () => Promise<boolean>
	): Promise<void> {
		if (
			!(await AdminScopeHelper.callerManages(
				this._accountDataEntityStorage,
				this._adminRoles,
				callerIsEscalated,
				accountId
			))
		) {
			throw new NotFoundError(
				EntityStorageAuthenticationAccountAdminService.CLASS_NAME,
				"userNotFound",
				accountId
			);
		}
	}

	/**
	 * Store the identity of an account, and issue the membership credentials of the organizations it
	 * was added to before it had one.
	 * @param accountId The account id.
	 * @param identity The DID.
	 * @param callerIsEscalated The check of whether the caller holds escalated privilege.
	 * @param proof The proof by the DID over the identity proof document.
	 * @returns The unique identifier of the item.
	 * @internal
	 */
	private async storeIdentity(
		accountId: string,
		identity: string,
		callerIsEscalated: () => Promise<boolean>,
		proof?: IProof
	): Promise<string> {
		// The checks are made while holding the lock, so they hold when the identity is stored, and the
		// cheap ones come before the proof, which resolves the DID.
		const lockKey = AccountDataHelper.identityLockKey(accountId);
		await Mutex.lock(lockKey, { throwOnTimeout: true });
		try {
			await AccountDataHelper.guardNoIdentity(this._accountDataEntityStorage, accountId);

			// The DID is locked as well, after the account, so another account can not bind it between
			// the check and the write.
			const didLockKey = AccountDataHelper.didLockKey(identity);
			await Mutex.lock(didLockKey, { throwOnTimeout: true });
			let id: string;
			try {
				// A DID the node holds, such as its own or an organization, can not be bound.
				await AccountDataHelper.guardIdentityAvailable(
					this._accountDataEntityStorage,
					this._organizationEntityStorage,
					identity
				);

				// The DID must be shown to be owned by the account, unless the caller has escalated privilege.
				if (!(await callerIsEscalated())) {
					await IdentityProofHelper.verify(
						this._identityComponent,
						accountId,
						identity,
						proof,
						this._identityProofMaxAgeSeconds
					);
				}

				id = await AccountDataHelper.createIdentity(
					this._accountDataEntityStorage,
					accountId,
					identity,
					{ accountChecked: true, availabilityChecked: true }
				);
			} finally {
				Mutex.unlock(didLockKey);
			}
			// A failure leaves that membership without a credential rather than failing the call.
			await PendingMembershipHelper.complete(
				this._accountDataEntityStorage,
				this._organizationEntityStorage,
				this._identityComponent,
				this._verificationMethodId,
				accountId,
				identity,
				{ logging: this._logging }
			);
			return id;
		} finally {
			Mutex.unlock(lockKey);
		}
	}

	/**
	 * Remove what the node holds for the identity of an account, keeping a document published on a
	 * ledger. An identity whose document or keys the node does not hold was adopted, so it is left.
	 * @param identity The DID.
	 * @returns A promise that resolves when the identity has been removed.
	 * @throws GeneralError when the node holds the identity and removing it fails.
	 * @internal
	 */
	private async removeNodeIdentity(identity: string): Promise<void> {
		try {
			// The identity of an account is self-controlled, so it is its own controller.
			await this._identityComponent.identityRemove(
				identity,
				{ removeKeys: true, removeDocumentKey: true, retainDocument: true },
				identity
			);
		} catch (error) {
			if (
				BaseError.someErrorName(error, NotFoundError.CLASS_NAME) ||
				BaseError.someErrorName(error, UnauthorizedError.CLASS_NAME) ||
				BaseError.someErrorMessage(error, /\.connectorNotFound$/)
			) {
				return;
			}
			throw new GeneralError(
				EntityStorageAuthenticationAccountAdminService.CLASS_NAME,
				"identityRemoveFailed",
				{ identity },
				error
			);
		}
	}

	/**
	 * Refuse a change by an admin to an avatar owned by the authentication provider. A system call,
	 * such as the authentication service storing the avatar of the provider, may change it.
	 * @param item The item.
	 * @returns A promise that resolves when the item may be changed.
	 * @throws ForbiddenError when the item is a read only avatar and the caller is an account.
	 * @internal
	 */
	private async guardProviderAvatar(item: IAuthenticationAccountData): Promise<void> {
		if (
			AccountDataHelper.isType(item.type, AuthenticationAccountDataType.Avatar) &&
			AuthenticationAccountHelper.isReadOnly(item.data) &&
			Is.stringValue(await AdminScopeHelper.callerAccount())
		) {
			throw new ForbiddenError(
				EntityStorageAuthenticationAccountAdminService.CLASS_NAME,
				"readOnly",
				{
					type: item.type
				}
			);
		}
	}

	/**
	 * Refuse a change to the items of a registered organization, its profiles are changed through the
	 * organization service so its search name stays in step.
	 * @param accountId The owner of the item.
	 * @returns A promise that resolves when the owner is not an organization.
	 * @throws UnprocessableError when the owner is a registered organization.
	 * @internal
	 */
	private async guardOrganizationProfile(accountId: string): Promise<void> {
		if (
			accountId.startsWith("did:") &&
			Is.object(await OrganizationHelper.findByIdentity(this._organizationEntityStorage, accountId))
		) {
			throw new UnprocessableError(
				EntityStorageAuthenticationAccountAdminService.CLASS_NAME,
				"organizationProfileManaged"
			);
		}
	}

	/**
	 * Refuse an account that does not belong to a user.
	 * @param accountId The account.
	 * @returns A promise that resolves when the account exists.
	 * @throws NotFoundError when it does not.
	 * @internal
	 */
	private async guardUser(accountId: string): Promise<void> {
		const result = await this._userEntityStorage.query(
			{ property: "accountId", value: accountId, comparison: ComparisonOperator.Equals },
			undefined,
			["accountId"],
			undefined,
			1
		);
		if (result.entities.length === 0) {
			throw new NotFoundError(
				EntityStorageAuthenticationAccountAdminService.CLASS_NAME,
				"userNotFound",
				accountId
			);
		}
	}

	/**
	 * Ensure the caller may change an account that holds escalated privilege, only a caller holding
	 * it may.
	 * @param accountId The account.
	 * @param callerIsEscalated The check of whether the caller holds escalated privilege.
	 * @returns A promise that resolves when the caller may change the account.
	 * @throws ForbiddenError when it may not.
	 * @internal
	 */
	private async guardEscalatedTarget(
		accountId: string,
		callerIsEscalated: () => Promise<boolean>
	): Promise<void> {
		if (
			!(await AdminScopeHelper.callerMayChange(
				this._authorizationComponent,
				this._authorizationModelId,
				this._escalatedPrivilegeRole,
				accountId,
				callerIsEscalated
			))
		) {
			throw new ForbiddenError(
				EntityStorageAuthenticationAccountAdminService.CLASS_NAME,
				"insufficientRoleForEscalatedTarget",
				{ roleName: this._escalatedPrivilegeRole }
			);
		}
	}

	/**
	 * Ensure only a caller with escalated privilege writes the node migration records, as the node
	 * assigns the roles they hold when it starts.
	 * @param type The type of the item.
	 * @param callerIsEscalated The check of whether the caller holds escalated privilege.
	 * @returns A promise that resolves when the caller may write the type.
	 * @throws ForbiddenError when it may not.
	 * @internal
	 */
	private async guardMigrationType(
		type: string,
		callerIsEscalated: () => Promise<boolean>
	): Promise<void> {
		if (
			AccountDataHelper.isType(type, EntityStorageAuthenticationAccountService.MIGRATION_TYPE) &&
			!(await callerIsEscalated())
		) {
			throw new ForbiddenError(
				EntityStorageAuthenticationAccountAdminService.CLASS_NAME,
				"migrationTypeNotPermitted",
				{ roleName: this._escalatedPrivilegeRole }
			);
		}
	}

	/**
	 * Ensure the caller may change the identity or organization of an account. A caller without
	 * escalated privilege may not change those of an escalated account, or of their own account.
	 * @param accountId The account being changed.
	 * @param callerIsEscalated The check of whether the caller holds escalated privilege.
	 * @returns A promise that resolves when the caller may change the account.
	 * @throws ForbiddenError when it may not.
	 * @internal
	 */
	private async guardContextChange(
		accountId: string,
		callerIsEscalated: () => Promise<boolean>
	): Promise<void> {
		await this.guardEscalatedTarget(accountId, callerIsEscalated);
		if ((await AdminScopeHelper.callerAccount()) === accountId && !(await callerIsEscalated())) {
			throw new ForbiddenError(
				EntityStorageAuthenticationAccountAdminService.CLASS_NAME,
				"ownAccountNotPermitted",
				{ roleName: this._escalatedPrivilegeRole }
			);
		}
	}
}
