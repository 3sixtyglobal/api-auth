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
import type { OrganizationRequest } from "../entities/organizationRequest.js";
import type { IEntityStorageAuthenticationAccountAdminServiceConstructorOptions } from "../models/IEntityStorageAuthenticationAccountAdminServiceConstructorOptions.js";
import type { IEntityStorageAuthenticationAccountServiceConstructorOptions } from "../models/IEntityStorageAuthenticationAccountServiceConstructorOptions.js";
import { AccountDataHelper } from "../utils/accountDataHelper.js";
import { AdminScopeHelper } from "../utils/adminScopeHelper.js";
import { IdentityProofHelper } from "../utils/identityProofHelper.js";
import { MembershipRemovalHelper } from "../utils/membershipRemovalHelper.js";
import { OrganizationHelper } from "../utils/organizationHelper.js";
import { PendingMembershipHelper } from "../utils/pendingMembershipHelper.js";

/**
 * Manages the data of any account of the tenant using entity storage. Accounts holding escalated
 * privilege, and the identity and organization of the caller's own account, are only changed by
 * callers holding escalated privilege.
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
	 * The entity storage type of the registered organizations, resolved when an account is added to one.
	 * @internal
	 */
	private readonly _organizationEntityStorageType: string;

	/**
	 * The authorization component used to guard accounts with escalated privilege.
	 * @internal
	 */
	private readonly _authorizationComponent?: IAuthorizationComponent;

	/**
	 * The identity component, when it exists.
	 * @internal
	 */
	private readonly _identityComponent?: IIdentityComponent;

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
	 * The entity storage for the requests to join an organization, when it exists.
	 * @internal
	 */
	private readonly _organizationRequestEntityStorage?: IEntityStorageConnector<OrganizationRequest>;

	/**
	 * The entity storage type of the users, resolved when an account is checked, as the
	 * authentication components that register it are created after this one.
	 * @internal
	 */
	private readonly _userEntityStorageType: string;

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
	 * The options of the account service that exports and imports the account data, created when
	 * first needed with the storage and components of this service.
	 * @internal
	 */
	private readonly _accountServiceOptions: IEntityStorageAuthenticationAccountServiceConstructorOptions;

	/**
	 * The account service that exports and imports the account data, as the account does itself.
	 * @internal
	 */
	private _accountService?: EntityStorageAuthenticationAccountService;

	/**
	 * Create a new instance of EntityStorageAuthenticationAccountAdminService.
	 * @param options The options for the service.
	 */
	constructor(options?: IEntityStorageAuthenticationAccountAdminServiceConstructorOptions) {
		this._accountDataEntityStorage = EntityStorageConnectorFactory.get(
			options?.accountDataEntityStorageType ?? "account-data"
		);
		this._authorizationComponent = ComponentFactory.getIfExists<IAuthorizationComponent>(
			options?.authorizationComponentType ?? "authorization"
		);
		this._organizationEntityStorageType =
			options?.organizationEntityStorageType ?? OrganizationHelper.DEFAULT_ENTITY_STORAGE_TYPE;
		this._identityComponent = ComponentFactory.getIfExists<IIdentityComponent>(
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
		this._organizationRequestEntityStorage = EntityStorageConnectorFactory.getIfExists<
			IEntityStorageConnector<OrganizationRequest>
		>(options?.organizationRequestEntityStorageType ?? "organization-request");
		this._userEntityStorageType = options?.userEntityStorageType ?? "authentication-user";
		this._logging = ComponentFactory.getIfExists<ILoggingComponent>(
			options?.loggingComponentType ?? "logging"
		);
		this._recentSignInSeconds =
			options?.config?.recentSignInSeconds ?? RecentSignInHelper.DEFAULT_MAX_AGE_SECONDS;
		this._accountServiceOptions = {
			accountDataEntityStorageType: options?.accountDataEntityStorageType,
			organizationEntityStorageType: options?.organizationEntityStorageType,
			organizationRequestEntityStorageType: options?.organizationRequestEntityStorageType,
			identityComponentType: options?.identityComponentType,
			loggingComponentType: options?.loggingComponentType,
			config: {
				verificationMethodId: options?.config?.verificationMethodId,
				identityProofMaxAgeSeconds: options?.config?.identityProofMaxAgeSeconds
			}
		};
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
	 */
	public async create(
		accountId: string,
		type: string,
		data: unknown,
		isDefault?: boolean,
		proof?: IProof
	): Promise<string> {
		Guards.stringValue(
			EntityStorageAuthenticationAccountAdminService.CLASS_NAME,
			nameof(accountId),
			accountId
		);
		// Variants such as "Identity" are normalised, so the handling below can not be skipped.
		type = AccountDataHelper.normaliseType(type);
		const callerIsEscalated = this.callerIsEscalatedOnce();
		await this.guardMigrationType(type, callerIsEscalated);
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
			await OrganizationHelper.guardRegistered(this._organizationEntityStorageType, organization);
			return PendingMembershipHelper.add(
				this._accountDataEntityStorage,
				this._identityComponent,
				this._verificationMethodId,
				accountId,
				organization,
				isDefault,
				this._organizationEntityStorageType
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
			isDefault
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
		await this.guardOrganizationProfile(accountId);
		await this.guardUser(accountId);
		await this.guardContextChange(accountId, this.callerIsEscalatedOnce());
		return this.accountService().createAccountIdentity(accountId);
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
		await this.guardOrganizationProfile(accountId);
		await this.guardUser(accountId);
		await this.guardEscalatedTarget(accountId, this.callerIsEscalatedOnce());
		if (Is.stringValue(await AdminScopeHelper.callerAccount())) {
			RecentSignInHelper.guard(sessionStart, this._recentSignInSeconds);
		}
		return this.accountService().exportAccountIdentity(accountId);
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
		await this.guardOrganizationProfile(accountId);
		await this.guardUser(accountId);
		await this.guardContextChange(accountId, this.callerIsEscalatedOnce());
		return this.accountService().importAccountIdentity(accountId, exported);
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
		await this.guardOrganizationProfile(accountId);
		await this.guardUser(accountId);
		await this.guardEscalatedTarget(accountId, this.callerIsEscalatedOnce());
		return this.accountService().exportAccountProfile(accountId);
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
		await this.guardOrganizationProfile(accountId);
		await this.guardUser(accountId);
		await this.guardEscalatedTarget(accountId, this.callerIsEscalatedOnce());
		return this.accountService().importAccountProfile(accountId, profile);
	}

	/**
	 * Get an item.
	 * @param id The unique identifier of the item.
	 * @returns The item.
	 * @throws NotFoundError when the item does not exist.
	 */
	public async get(id: string): Promise<IAuthenticationAccountData> {
		return AccountDataHelper.get(this._accountDataEntityStorage, id);
	}

	/**
	 * Replace the value of an item.
	 * @param id The unique identifier of the item.
	 * @param data The new value of the item.
	 * @param isDefault True to use the item first for its type, clearing any other default, unchanged when omitted.
	 * @returns A promise that resolves when the item has been updated.
	 * @throws NotFoundError when the item does not exist.
	 * @throws UnprocessableError when the DID of an identity or an organization is changed, remove
	 * it and create another.
	 * @throws ForbiddenError when the identity or organization of an escalated account, or of the
	 * caller's own account, is changed by a caller without escalated privilege, or an admin
	 * changes an avatar owned by the authentication provider.
	 */
	public async update(id: string, data: unknown, isDefault?: boolean): Promise<void> {
		const item = await AccountDataHelper.get(this._accountDataEntityStorage, id);
		const callerIsEscalated = this.callerIsEscalatedOnce();
		await this.guardMigrationType(item.type, callerIsEscalated);
		await this.guardOrganizationProfile(item.accountId);
		await this.guardProviderAvatar(item);
		if (this.isReservedType(item.type)) {
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
		await AccountDataHelper.updateItem(this._accountDataEntityStorage, item, data, isDefault);
	}

	/**
	 * Remove an item. Removing an organization removes the account from it, revoking the membership
	 * credential the node issued and removing the membership credentials of the organization the
	 * account holds. Removing an identity removes it as the account would, with the keys the node
	 * holds for it, the credentials, organizations and pending requests to join one.
	 * @param id The unique identifier of the item.
	 * @returns A promise that resolves when the item has been removed.
	 * @throws NotFoundError when the item does not exist.
	 * @throws ForbiddenError when the identity or organization of an escalated account, or of the
	 * caller's own account, is removed by a caller without escalated privilege, or an admin
	 * removes an avatar owned by the authentication provider.
	 * @throws GeneralError when the node holds the keys of an identity and removing them fails.
	 */
	public async remove(id: string): Promise<void> {
		const item = await AccountDataHelper.get(this._accountDataEntityStorage, id);
		const callerIsEscalated = this.callerIsEscalatedOnce();
		await this.guardMigrationType(item.type, callerIsEscalated);
		await this.guardOrganizationProfile(item.accountId);
		await this.guardProviderAvatar(item);
		if (this.isReservedType(item.type)) {
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
	 * Query the items of any account.
	 * @param accountId The account of the items to return, all accounts when omitted.
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
		// The node migration records are kept out of listings unless asked for by type.
		return AccountDataHelper.query(this._accountDataEntityStorage, accountId, type, cursor, limit, [
			EntityStorageAuthenticationAccountService.MIGRATION_TYPE
		]);
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
		const identityComponent = this._identityComponent;

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
					this._organizationEntityStorageType,
					identity
				);

				// The DID must be shown to be owned by the account, unless the caller has escalated privilege.
				if (!(await callerIsEscalated())) {
					if (Is.empty(identityComponent)) {
						throw new GeneralError(
							EntityStorageAuthenticationAccountAdminService.CLASS_NAME,
							"identityComponentMissing"
						);
					}
					await IdentityProofHelper.verify(
						identityComponent,
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
			if (Is.object(identityComponent)) {
				// A failure leaves that membership without a credential rather than failing the call.
				await PendingMembershipHelper.complete(
					this._accountDataEntityStorage,
					identityComponent,
					this._verificationMethodId,
					accountId,
					identity,
					{
						organizationEntityStorageType: this._organizationEntityStorageType,
						logging: this._logging
					}
				);
			}
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
		if (Is.empty(this._identityComponent)) {
			return;
		}
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
			Is.object(
				await OrganizationHelper.findRegistered(this._organizationEntityStorageType, accountId)
			)
		) {
			throw new UnprocessableError(
				EntityStorageAuthenticationAccountAdminService.CLASS_NAME,
				"organizationProfileManaged"
			);
		}
	}

	/**
	 * Refuse an account that does not belong to a user, checked only when the user storage exists.
	 * @param accountId The account.
	 * @returns A promise that resolves when the account exists.
	 * @throws NotFoundError when it does not.
	 * @internal
	 */
	private async guardUser(accountId: string): Promise<void> {
		const userEntityStorage = EntityStorageConnectorFactory.getIfExists<
			IEntityStorageConnector<{ accountId: string }>
		>(this._userEntityStorageType);
		if (Is.empty(userEntityStorage)) {
			return;
		}
		const result = await userEntityStorage.query(
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
	 * Get the account service that exports and imports the account data, created when first needed.
	 * @returns The service.
	 * @internal
	 */
	private accountService(): EntityStorageAuthenticationAccountService {
		this._accountService ??= new EntityStorageAuthenticationAccountService(
			this._accountServiceOptions
		);
		return this._accountService;
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
	 * Check whether a type grants an account its identity or organization, ignoring case.
	 * @param type The type.
	 * @returns True when it does.
	 * @internal
	 */
	private isReservedType(type: string): boolean {
		return AccountDataHelper.isType(
			type,
			...EntityStorageAuthenticationAccountAdminService._CONTEXT_TYPES
		);
	}

	/**
	 * Get a check of whether the caller holds escalated privilege, system calls do, that looks the
	 * role up at most once, for a single call.
	 * @returns The check.
	 * @internal
	 */
	private callerIsEscalatedOnce(): () => Promise<boolean> {
		return AdminScopeHelper.callerIsEscalatedOnce(
			this._authorizationComponent,
			this._authorizationModelId,
			this._escalatedPrivilegeRole
		);
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
