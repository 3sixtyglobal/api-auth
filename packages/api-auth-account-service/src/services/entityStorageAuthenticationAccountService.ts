// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import {
	AuthenticationAccountDataType,
	ExportFileHelper,
	ExportFileType,
	AuthenticationAccountHelper,
	type IAccountIdentityExport,
	type IAccountIdentityImportResult,
	type IAccountProfileExport,
	type IAccountProfileImportResult,
	type IAuthenticationAccountComponent,
	type IAuthenticationAccountData,
	type IAuthenticationRateActionConfig,
	type IAuthenticationRateComponent,
	type IOrganizationRequest,
	OrganizationRequestStatus,
	RecentSignInHelper
} from "@3sixty/api-auth-models";
import { ForbiddenError } from "@3sixty/api-models";
import { ContextIdHelper, ContextIdKeys, ContextIdStore } from "@3sixty/context";
import {
	BaseError,
	ComponentFactory,
	ConflictError,
	GeneralError,
	Guards,
	Is,
	Mutex,
	NotFoundError,
	RandomHelper,
	UnauthorizedError,
	UnprocessableError
} from "@3sixty/core";
import {
	EntityStorageConnectorFactory,
	type IEntityStorageConnector
} from "@3sixty/entity-storage-models";
import { Did, type IIdentityComponent, type IIdentityExport } from "@3sixty/identity-models";
import type { ILoggingComponent } from "@3sixty/logging-models";
import { nameof } from "@3sixty/nameof";
import type { IDidVerifiableCredential, IProof } from "@3sixty/standards-w3c-did";
import type { AccountData } from "../entities/accountData.js";
import type { OrganizationRequest } from "../entities/organizationRequest.js";
import type { IEntityStorageAuthenticationAccountServiceConstructorOptions } from "../models/IEntityStorageAuthenticationAccountServiceConstructorOptions.js";
import { AccountDataHelper } from "../utils/accountDataHelper.js";
import { AccountProfileHelper } from "../utils/accountProfileHelper.js";
import { AdminScopeHelper } from "../utils/adminScopeHelper.js";
import { IdentityProofHelper } from "../utils/identityProofHelper.js";
import { MembershipRemovalHelper } from "../utils/membershipRemovalHelper.js";
import { OrganizationHelper } from "../utils/organizationHelper.js";
import { OrganizationMembershipHelper } from "../utils/organizationMembershipHelper.js";
import { OrganizationRequestHelper } from "../utils/organizationRequestHelper.js";
import { PendingMembershipHelper } from "../utils/pendingMembershipHelper.js";

/**
 * Stores the data of the signed in account using entity storage.
 */
export class EntityStorageAuthenticationAccountService implements IAuthenticationAccountComponent {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<EntityStorageAuthenticationAccountService>();

	/**
	 * The type of the records the node migration keeps until its pending work is done, hidden from
	 * account data listings.
	 */
	public static readonly MIGRATION_TYPE: string = AccountDataHelper.MIGRATION_TYPE;

	/**
	 * The types only set through adoptIdentity and joinOrganization, as they grant the account its
	 * identity and organization, and the migration records. They are matched once normalised.
	 */
	public static readonly RESERVED_TYPES: string[] = [
		AuthenticationAccountDataType.Identity,
		AuthenticationAccountDataType.Organization,
		EntityStorageAuthenticationAccountService.MIGRATION_TYPE
	];

	/**
	 * The rate limit action for adopting an identity.
	 */
	public static readonly RATE_ACTION_ADOPT_IDENTITY: string = "adopt-identity";

	/**
	 * The rate limit action for exporting the identity.
	 */
	public static readonly RATE_ACTION_EXPORT_IDENTITY: string = "export-identity";

	/**
	 * The rate limit action for importing an identity.
	 */
	public static readonly RATE_ACTION_IMPORT_IDENTITY: string = "import-identity";

	/**
	 * The rate limit action for exporting the account data.
	 */
	public static readonly RATE_ACTION_EXPORT_PROFILE: string = "export-profile";

	/**
	 * The rate limit action for importing account data.
	 */
	public static readonly RATE_ACTION_IMPORT_PROFILE: string = "import-profile";

	/**
	 * The default most credentials an identity import may hold.
	 */
	public static readonly DEFAULT_IDENTITY_IMPORT_MAX_CREDENTIALS: number = 100;

	/**
	 * The default verification method of the organization that signs the membership credential.
	 */
	public static readonly DEFAULT_VERIFICATION_METHOD_ID: string = "trust-assertion";

	/**
	 * The default most items an account may store itself.
	 */
	public static readonly DEFAULT_MAX_ITEMS: number = 1000;

	/**
	 * The default most items of a type an account may store itself, by type.
	 */
	public static readonly DEFAULT_MAX_ITEMS_BY_TYPE: { [type: string]: number } = {
		[AuthenticationAccountDataType.VerifiableCredential]: 200
	};

	/**
	 * The number of credentials of an identity import verified at once.
	 * @internal
	 */
	private static readonly _VERIFY_CONCURRENCY: number = 5;

	/**
	 * The profile types an authentication provider may own, including the avatar.
	 * @internal
	 */
	private static readonly _PROFILE_TYPES: string[] = [
		AuthenticationAccountDataType.PublicProfile,
		AuthenticationAccountDataType.PrivateProfile,
		AuthenticationAccountDataType.Avatar
	];

	/**
	 * The entity storage for account data.
	 * @internal
	 */
	private readonly _accountDataEntityStorage: IEntityStorageConnector<AccountData>;

	/**
	 * The entity storage for the requests to join an organization.
	 * @internal
	 */
	private readonly _organizationRequestEntityStorage: IEntityStorageConnector<OrganizationRequest>;

	/**
	 * The entity storage type of the registered organizations, resolved when an account asks to join one.
	 * @internal
	 */
	private readonly _organizationEntityStorageType: string;

	/**
	 * The identity component, when it exists.
	 * @internal
	 */
	private readonly _identityComponent?: IIdentityComponent;

	/**
	 * The rate component, when it exists.
	 * @internal
	 */
	private readonly _authenticationRateService?: IAuthenticationRateComponent;

	/**
	 * The rate limits registered with the rate component, by action.
	 * @internal
	 */
	private readonly _rateLimits: { [action: string]: IAuthenticationRateActionConfig };

	/**
	 * How long ago the session may have started for exporting or removing the identity, in seconds.
	 * @internal
	 */
	private readonly _recentSignInSeconds: number;

	/**
	 * The limits of an account data import.
	 * @internal
	 */
	private readonly _profileImportLimits: { maxItems: number; maxBytes: number };

	/**
	 * The most credentials an identity import may hold.
	 * @internal
	 */
	private readonly _identityImportMaxCredentials: number;

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
	 * The logging component, when it exists.
	 * @internal
	 */
	private readonly _logging?: ILoggingComponent;

	/**
	 * The most items an account may store itself.
	 * @internal
	 */
	private readonly _maxItems: number;

	/**
	 * The most items of a type an account may store itself, by normalised type.
	 * @internal
	 */
	private readonly _maxItemsByType: { [type: string]: number };

	/**
	 * Create a new instance of EntityStorageAuthenticationAccountService.
	 * @param options The options for the service.
	 */
	constructor(options?: IEntityStorageAuthenticationAccountServiceConstructorOptions) {
		this._accountDataEntityStorage = EntityStorageConnectorFactory.get(
			options?.accountDataEntityStorageType ?? "account-data"
		);
		this._organizationRequestEntityStorage = EntityStorageConnectorFactory.get(
			options?.organizationRequestEntityStorageType ?? "organization-request"
		);
		this._organizationEntityStorageType =
			options?.organizationEntityStorageType ?? OrganizationHelper.DEFAULT_ENTITY_STORAGE_TYPE;
		this._identityComponent = ComponentFactory.getIfExists<IIdentityComponent>(
			options?.identityComponentType ?? "identity-service"
		);
		this._authenticationRateService = ComponentFactory.getIfExists<IAuthenticationRateComponent>(
			options?.authenticationRateServiceType ?? "authentication-rate"
		);
		const config = options?.config;
		this._rateLimits = {
			[EntityStorageAuthenticationAccountService.RATE_ACTION_ADOPT_IDENTITY]: this.rateLimit(
				config?.adoptIdentityRateLimit,
				5
			),
			[EntityStorageAuthenticationAccountService.RATE_ACTION_EXPORT_IDENTITY]: this.rateLimit(
				config?.exportIdentityRateLimit,
				5
			),
			[EntityStorageAuthenticationAccountService.RATE_ACTION_IMPORT_IDENTITY]: this.rateLimit(
				config?.importIdentityRateLimit,
				5
			),
			[EntityStorageAuthenticationAccountService.RATE_ACTION_EXPORT_PROFILE]: this.rateLimit(
				config?.exportProfileRateLimit,
				10
			),
			[EntityStorageAuthenticationAccountService.RATE_ACTION_IMPORT_PROFILE]: this.rateLimit(
				config?.importProfileRateLimit,
				10
			)
		};
		this._recentSignInSeconds =
			config?.recentSignInSeconds ?? RecentSignInHelper.DEFAULT_MAX_AGE_SECONDS;
		this._profileImportLimits = {
			maxItems: config?.profileImportMaxItems ?? AccountProfileHelper.DEFAULT_MAX_ITEMS,
			maxBytes: config?.profileImportMaxBytes ?? AccountProfileHelper.DEFAULT_MAX_BYTES
		};
		this._identityImportMaxCredentials =
			config?.identityImportMaxCredentials ??
			EntityStorageAuthenticationAccountService.DEFAULT_IDENTITY_IMPORT_MAX_CREDENTIALS;
		this._identityProofMaxAgeSeconds =
			options?.config?.identityProofMaxAgeSeconds ?? IdentityProofHelper.DEFAULT_MAX_AGE_SECONDS;
		this._verificationMethodId =
			options?.config?.verificationMethodId ??
			EntityStorageAuthenticationAccountService.DEFAULT_VERIFICATION_METHOD_ID;
		this._logging = ComponentFactory.getIfExists<ILoggingComponent>(
			options?.loggingComponentType ?? "logging"
		);
		this._maxItems =
			config?.maxItems ?? EntityStorageAuthenticationAccountService.DEFAULT_MAX_ITEMS;
		this._maxItemsByType = {};
		for (const [type, maxItems] of Object.entries({
			...EntityStorageAuthenticationAccountService.DEFAULT_MAX_ITEMS_BY_TYPE,
			...config?.maxItemsByType
		})) {
			this._maxItemsByType[AccountDataHelper.normaliseType(type)] = maxItems;
		}
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return EntityStorageAuthenticationAccountService.CLASS_NAME;
	}

	/**
	 * The service needs to be started when the application is initialized.
	 * @param nodeLoggingComponentType The node logging component type.
	 * @returns A promise that resolves when the rate limit actions have been registered.
	 */
	public async start(nodeLoggingComponentType?: string): Promise<void> {
		for (const [action, limit] of Object.entries(this._rateLimits)) {
			await this._authenticationRateService?.registerAction(action, limit);
		}
	}

	/**
	 * The component needs to be stopped when the node is closed.
	 * @param nodeLoggingComponentType The node logging component type.
	 * @returns A promise that resolves when the rate limit actions have been unregistered.
	 */
	public async stop(nodeLoggingComponentType?: string): Promise<void> {
		for (const action of Object.keys(this._rateLimits)) {
			await this._authenticationRateService?.unregisterAction(action);
		}
	}

	/**
	 * Adopt an identity for the signed in account, an account has only one.
	 * @param identity The DID to adopt, a new self-controlled DID is created when omitted.
	 * @param proof A proof by the DID over the identity proof document, required with the identity.
	 * @param sessionStart When the session of the caller started in seconds, it must be recent.
	 * @returns The DID of the account.
	 * @throws ConflictError when the account already has an identity, or the DID is held by an
	 * account, the node or an organization.
	 * @throws UnauthorizedError when the proof does not show the DID is owned by the caller, or the
	 * session did not start recently.
	 * @throws TooManyRequestsError when the account adopts too often.
	 */
	public async adoptIdentity(
		identity?: string,
		proof?: IProof,
		sessionStart?: number
	): Promise<string> {
		const accountId = await this.signedInAccount();
		RecentSignInHelper.guard(sessionStart, this._recentSignInSeconds);

		const identityComponent = this._identityComponent;
		if (Is.empty(identityComponent)) {
			throw new GeneralError(
				EntityStorageAuthenticationAccountService.CLASS_NAME,
				"identityComponentMissing"
			);
		}

		await this._authenticationRateService?.check(
			EntityStorageAuthenticationAccountService.RATE_ACTION_ADOPT_IDENTITY,
			accountId
		);

		// Concurrent requests for the account are serialised, so each sees the identity of the last.
		const lockKey = AccountDataHelper.identityLockKey(accountId);
		await Mutex.lock(lockKey, { throwOnTimeout: true });
		try {
			const documentId = Is.stringValue(identity)
				? await this.adoptExisting(identityComponent, accountId, identity, proof)
				: await this.adoptCreated(identityComponent, accountId);

			// Organizations the account was added to before it had an identity get their credential, a
			// failure leaves that membership without one rather than failing the adoption.
			await this.completePendingMemberships(identityComponent, accountId, documentId);
			return documentId;
		} finally {
			Mutex.unlock(lockKey);
		}
	}

	/**
	 * Create a self-controlled DID for an account that has none and give it to the account, for the
	 * account admin service, which checks the caller first. Organizations the account was added to
	 * before it had an identity get their credential.
	 * @param accountId The account.
	 * @returns The DID of the account.
	 * @throws ConflictError when the account already has an identity.
	 */
	public async createAccountIdentity(accountId: string): Promise<string> {
		Guards.stringValue(
			EntityStorageAuthenticationAccountService.CLASS_NAME,
			nameof(accountId),
			accountId
		);
		const identityComponent = this.requireIdentityComponent();

		const lockKey = AccountDataHelper.identityLockKey(accountId);
		await Mutex.lock(lockKey, { throwOnTimeout: true });
		try {
			const documentId = await this.adoptCreated(identityComponent, accountId);
			await this.completePendingMemberships(identityComponent, accountId, documentId);
			return documentId;
		} finally {
			Mutex.unlock(lockKey);
		}
	}

	/**
	 * Export the identity of the signed in account with its private keys and the credentials the
	 * account holds, only when the node holds the keys of the identity.
	 * @param sessionStart When the session of the caller started in seconds, it must be recent.
	 * @returns The export, which contains private keys and must be protected.
	 * @throws UnauthorizedError when the session did not start recently.
	 * @throws NotFoundError when the account has no identity.
	 * @throws UnprocessableError when the node does not hold the keys of the identity.
	 * @throws TooManyRequestsError when the account exports too often.
	 */
	public async exportIdentity(sessionStart?: number): Promise<IAccountIdentityExport> {
		const accountId = await this.signedInAccount();
		RecentSignInHelper.guard(sessionStart, this._recentSignInSeconds);
		const identityComponent = this.requireIdentityComponent();
		await this._authenticationRateService?.check(
			EntityStorageAuthenticationAccountService.RATE_ACTION_EXPORT_IDENTITY,
			accountId
		);
		return this.exportAccountIdentity(accountId, identityComponent);
	}

	/**
	 * Export the identity of an account with its private keys and the credentials it holds, for the
	 * account itself and the account admin service, which check the caller first.
	 * @param accountId The account.
	 * @param identityComponent The identity component that holds the keys, the configured one when
	 * omitted.
	 * @returns The export, which contains private keys and must be protected.
	 * @throws NotFoundError when the account has no identity.
	 * @throws UnprocessableError when the node does not hold the keys of the identity.
	 */
	public async exportAccountIdentity(
		accountId: string,
		identityComponent: IIdentityComponent = this.requireIdentityComponent()
	): Promise<IAccountIdentityExport> {
		Guards.stringValue(
			EntityStorageAuthenticationAccountService.CLASS_NAME,
			nameof(accountId),
			accountId
		);
		const identity = await this.requireIdentity(accountId);
		const [exported, credentials] = await Promise.all([
			this.exportOwnIdentity(identityComponent, identity),
			MembershipRemovalHelper.loadCredentialItems(this._accountDataEntityStorage, accountId)
		]);
		return {
			type: ExportFileType.AccountIdentity,
			version: ExportFileHelper.VERSION,
			identity: exported,
			// Only JSON credentials are exported, other values are ignored.
			credentials: credentials
				.map(item => AuthenticationAccountHelper.getCredential(item.data))
				.filter(credential => !Is.undefined(credential))
		};
	}

	/**
	 * Import a self-controlled identity into the signed in account, instead of adopting one. Each
	 * credential is verified in full and stored when it is issued to the identity and not revoked,
	 * the others are skipped. The account becomes a member of each registered organization whose
	 * membership credential it holds, without any role, only when the credential carries a
	 * revocation status the node can check, so a membership that ended, whose credential was
	 * revoked, is not restored. A credential without a revocation status is stored as a credential
	 * only. The identity is removed from the node again when binding it fails.
	 * @param exported The export of the identity and its credentials.
	 * @param sessionStart When the session of the caller started in seconds, it must be recent.
	 * @returns The DID and what was imported.
	 * @throws UnprocessableError when the export is not valid or not self-controlled.
	 * @throws ConflictError when the account already has an identity, or the DID is held.
	 * @throws UnauthorizedError when the session did not start recently.
	 * @throws TooManyRequestsError when the account imports too often.
	 */
	public async importIdentity(
		exported: IAccountIdentityExport,
		sessionStart?: number
	): Promise<IAccountIdentityImportResult> {
		const accountId = await this.signedInAccount();
		// Checked before anything else, so the wrong kind of file is refused at once.
		ExportFileHelper.guard(exported, ExportFileType.AccountIdentity);
		RecentSignInHelper.guard(sessionStart, this._recentSignInSeconds);
		const identityComponent = this.requireIdentityComponent();
		await this._authenticationRateService?.check(
			EntityStorageAuthenticationAccountService.RATE_ACTION_IMPORT_IDENTITY,
			accountId
		);
		return this.importAccountIdentity(accountId, exported, identityComponent);
	}

	/**
	 * Import a self-controlled identity into an account, for the account itself and the account
	 * admin service, which check the caller first. See importIdentity for what is imported.
	 * @param accountId The account.
	 * @param exported The export of the identity and its credentials.
	 * @param identityComponent The identity component that holds the keys, the configured one when
	 * omitted.
	 * @returns The DID and what was imported.
	 * @throws UnprocessableError when the export is not valid or not self-controlled.
	 * @throws ConflictError when the account already has an identity, or the DID is held.
	 */
	public async importAccountIdentity(
		accountId: string,
		exported: IAccountIdentityExport,
		identityComponent: IIdentityComponent = this.requireIdentityComponent()
	): Promise<IAccountIdentityImportResult> {
		Guards.stringValue(
			EntityStorageAuthenticationAccountService.CLASS_NAME,
			nameof(accountId),
			accountId
		);
		ExportFileHelper.guard(exported, ExportFileType.AccountIdentity);
		const identity = this.guardIdentityExport(exported);

		const lockKey = AccountDataHelper.identityLockKey(accountId);
		await Mutex.lock(lockKey, { throwOnTimeout: true });
		let result: IAccountIdentityImportResult;
		try {
			await AccountDataHelper.guardNoIdentity(this._accountDataEntityStorage, accountId);

			const created: string[] = [];
			await this.withDidLock(identity, async () => {
				await AccountDataHelper.guardIdentityAvailable(
					this._accountDataEntityStorage,
					this._organizationEntityStorageType,
					identity
				);

				// The import proves the keys match the document before anything is stored.
				try {
					await identityComponent.identityImport(exported.identity, identity);
				} catch (error) {
					// The node already holds the DID, which is a conflict rather than a failure.
					if (BaseError.someErrorName(error, ConflictError.CLASS_NAME)) {
						throw new ConflictError(
							EntityStorageAuthenticationAccountService.CLASS_NAME,
							"identityImportConflict",
							identity,
							undefined,
							undefined,
							error
						);
					}
					// The keys do not match the document, or the export is otherwise refused.
					throw new UnprocessableError(
						EntityStorageAuthenticationAccountService.CLASS_NAME,
						"identityExportInvalid",
						undefined,
						error
					);
				}

				try {
					created.push(
						await AccountDataHelper.createIdentity(
							this._accountDataEntityStorage,
							accountId,
							identity,
							{ accountChecked: true, availabilityChecked: true }
						)
					);
				} catch (error) {
					await this.rollbackImport(identityComponent, accountId, identity, created);
					throw error;
				}
			});

			try {
				result = await this.importCredentials(
					identityComponent,
					accountId,
					identity,
					exported.credentials ?? [],
					created
				);
			} catch (error) {
				await this.rollbackImport(identityComponent, accountId, identity, created);
				throw error;
			}

			await this.completePendingMemberships(identityComponent, accountId, identity);
		} finally {
			Mutex.unlock(lockKey);
		}
		return result;
	}

	/**
	 * Remove the identity of the signed in account with its credentials, organizations and pending
	 * requests to join one. The keys the node holds for the identity are removed, and a document
	 * stored on the node with them, a document published on a ledger is kept so an export of it can
	 * be imported again. An identity the account adopted, whose keys the node does not hold, is only
	 * unbound.
	 * @param sessionStart When the session of the caller started in seconds, it must be recent.
	 * @returns A promise that resolves when the identity has been removed.
	 * @throws UnauthorizedError when the session did not start recently.
	 * @throws NotFoundError when the account has no identity.
	 */
	public async removeIdentity(sessionStart?: number): Promise<void> {
		const accountId = await this.signedInAccount();
		RecentSignInHelper.guard(sessionStart, this._recentSignInSeconds);

		const lockKey = AccountDataHelper.identityLockKey(accountId);
		await Mutex.lock(lockKey, { throwOnTimeout: true });
		try {
			const identity = await this.requireIdentity(accountId);
			await this.removeNodeIdentity(identity);
			await MembershipRemovalHelper.removeAll(
				this._accountDataEntityStorage,
				this._organizationRequestEntityStorage,
				this._identityComponent,
				accountId
			);
		} finally {
			Mutex.unlock(lockKey);
		}
	}

	/**
	 * Leave an organization with the signed in account, removing the organization and the membership
	 * credentials it issued, which are revoked when they can be and the node signs for the
	 * organization. Membership grants no role so none is removed, and requests to join are kept.
	 * @param organization The DID of the organization.
	 * @returns A promise that resolves when the account has left.
	 * @throws NotFoundError when the account is not in the organization.
	 */
	public async leaveOrganization(organization: string): Promise<void> {
		Did.guard(
			EntityStorageAuthenticationAccountService.CLASS_NAME,
			nameof(organization),
			organization
		);
		const accountId = await this.signedInAccount();

		const left = await MembershipRemovalHelper.leave(
			this._accountDataEntityStorage,
			this._identityComponent,
			accountId,
			organization
		);
		if (!left) {
			throw new NotFoundError(
				EntityStorageAuthenticationAccountService.CLASS_NAME,
				"organizationNotJoined",
				organization
			);
		}
	}

	/**
	 * Export the account data of the signed in account, other than its identity, organizations,
	 * credentials and node migration records, in the order the items were created.
	 * @returns The export.
	 * @throws TooManyRequestsError when the account exports too often.
	 */
	public async exportProfile(): Promise<IAccountProfileExport> {
		const accountId = await this.signedInAccount();
		await this._authenticationRateService?.check(
			EntityStorageAuthenticationAccountService.RATE_ACTION_EXPORT_PROFILE,
			accountId
		);
		return AccountProfileHelper.export(this._accountDataEntityStorage, accountId);
	}

	/**
	 * Replace the account data of the signed in account with an export. The existing items of the
	 * types an export may hold are removed once the items of the export have been created, keeping
	 * the first default of each type and the order of the items. The types of which the account
	 * holds an item owned by an authentication provider are left as they are.
	 * @param profile The export.
	 * @returns What was imported and removed.
	 * @throws UnprocessableError when the export is not valid, too large, or holds a type that moves
	 * with the identity.
	 * @throws TooManyRequestsError when the account imports too often.
	 */
	public async importProfile(profile: IAccountProfileExport): Promise<IAccountProfileImportResult> {
		const accountId = await this.signedInAccount();
		// Checked before anything else, so the wrong kind of file is refused at once.
		ExportFileHelper.guard(profile, ExportFileType.AccountProfile);
		await this._authenticationRateService?.check(
			EntityStorageAuthenticationAccountService.RATE_ACTION_IMPORT_PROFILE,
			accountId
		);
		return this.importAccountProfile(accountId, profile);
	}

	/**
	 * Export the account data of an account, for the account admin service, which checks the caller
	 * first. See exportProfile for what is exported.
	 * @param accountId The account.
	 * @returns The export.
	 */
	public async exportAccountProfile(accountId: string): Promise<IAccountProfileExport> {
		Guards.stringValue(
			EntityStorageAuthenticationAccountService.CLASS_NAME,
			nameof(accountId),
			accountId
		);
		return AccountProfileHelper.export(this._accountDataEntityStorage, accountId);
	}

	/**
	 * Replace the account data of an account with an export, for the account itself and the account
	 * admin service, which check the caller first. See importProfile for what is replaced.
	 * @param accountId The account.
	 * @param profile The export.
	 * @returns What was imported and removed.
	 * @throws UnprocessableError when the export is not valid, too large, or holds a type that moves
	 * with the identity.
	 */
	public async importAccountProfile(
		accountId: string,
		profile: IAccountProfileExport
	): Promise<IAccountProfileImportResult> {
		Guards.stringValue(
			EntityStorageAuthenticationAccountService.CLASS_NAME,
			nameof(accountId),
			accountId
		);
		ExportFileHelper.guard(profile, ExportFileType.AccountProfile);
		const lockKey = `account-profile-${accountId}`;
		await Mutex.lock(lockKey, { throwOnTimeout: true });
		try {
			return await AccountProfileHelper.import(
				this._accountDataEntityStorage,
				accountId,
				profile,
				this._profileImportLimits
			);
		} finally {
			Mutex.unlock(lockKey);
		}
	}

	/**
	 * Ask to join an organization with the signed in account, an admin accepts or rejects the request.
	 * @param organization The DID of the organization to join.
	 * @returns A promise that resolves when the request has been made.
	 * @throws UnprocessableError when the account has no identity.
	 * @throws ConflictError when the account is already in the organization or has a request pending.
	 * @throws NotFoundError when the organization is not registered.
	 */
	public async joinOrganization(organization: string): Promise<void> {
		Did.guard(
			EntityStorageAuthenticationAccountService.CLASS_NAME,
			nameof(organization),
			organization
		);
		const contextIds = await ContextIdStore.getContextIds();
		ContextIdHelper.guard(contextIds, ContextIdKeys.Account);
		const accountId = contextIds[ContextIdKeys.Account];

		// The reads are independent, so they are made together and checked in order after.
		const [, hasIdentity, isMember, pending] = await Promise.all([
			OrganizationHelper.guardRegistered(this._organizationEntityStorageType, organization),
			this.hasIdentity(accountId, contextIds[ContextIdKeys.User]),
			AdminScopeHelper.isMember(this._accountDataEntityStorage, accountId, organization),
			OrganizationRequestHelper.findPending(
				this._organizationRequestEntityStorage,
				accountId,
				organization
			)
		]);

		// The membership credential is issued to the identity, so the account needs one first.
		if (!hasIdentity) {
			throw new UnprocessableError(
				EntityStorageAuthenticationAccountService.CLASS_NAME,
				"identityRequired"
			);
		}
		if (isMember) {
			throw new ConflictError(
				EntityStorageAuthenticationAccountService.CLASS_NAME,
				"organizationAlreadyJoined",
				organization
			);
		}
		if (Is.object(pending)) {
			throw new ConflictError(
				EntityStorageAuthenticationAccountService.CLASS_NAME,
				"organizationRequestPending",
				pending.id
			);
		}

		const now = new Date().toISOString();
		await this._organizationRequestEntityStorage.set({
			id: RandomHelper.generateUuidV7(),
			accountId,
			organization,
			status: OrganizationRequestStatus.Pending,
			dateCreated: now,
			dateModified: now
		});
	}

	/**
	 * Cancel the pending request of the signed in account to join an organization. The request is
	 * removed, as when the identity is removed, so the requests answered before are kept and the
	 * latest of them is the status again.
	 * @returns A promise that resolves when the request has been cancelled.
	 * @throws NotFoundError when no request is pending.
	 */
	public async cancelOrganizationRequest(): Promise<void> {
		const accountId = await this.signedInAccount();

		const pending = await OrganizationRequestHelper.findAllPending(
			this._organizationRequestEntityStorage,
			accountId
		);
		if (pending.length === 0) {
			throw new NotFoundError(OrganizationRequestHelper.CLASS_NAME, "organizationRequestNotFound");
		}
		for (const request of pending) {
			// Only while still pending, so a request an admin answered meanwhile is kept.
			await this._organizationRequestEntityStorage.remove(request.id, [
				{ property: "status", value: OrganizationRequestStatus.Pending }
			]);
		}
	}

	/**
	 * Get the request of the signed in account to join an organization, so its status can be shown.
	 * @returns The pending request, otherwise the latest request, or undefined when none was made.
	 */
	public async getOrganizationRequest(): Promise<IOrganizationRequest | undefined> {
		const accountId = await this.signedInAccount();

		const { pending, latest } = await OrganizationRequestHelper.findForAccount(
			this._organizationRequestEntityStorage,
			accountId
		);
		return pending ?? latest;
	}

	/**
	 * Get the organization of the signed in account.
	 * @returns The DID of the organization, or undefined while there is none or a request is pending.
	 * @throws UnprocessableError when the account has no organization and its latest request to join
	 * one was rejected, with the organization and the i18n key of the reason.
	 */
	public async getOrganization(): Promise<string | undefined> {
		const contextIds = await ContextIdStore.getContextIds();
		ContextIdHelper.guard(contextIds, ContextIdKeys.Account);
		const accountId = contextIds[ContextIdKeys.Account];

		// The account processor has already resolved the organization of the request.
		const contextOrganization = contextIds[ContextIdKeys.UserOrganization];
		if (Is.stringValue(contextOrganization)) {
			return contextOrganization;
		}

		const [organization, requests] = await Promise.all([
			AccountDataHelper.getDefault(
				this._accountDataEntityStorage,
				accountId,
				AuthenticationAccountDataType.Organization
			),
			OrganizationRequestHelper.findForAccount(this._organizationRequestEntityStorage, accountId)
		]);
		const organizationId = AuthenticationAccountHelper.getOrganization(organization?.data);
		if (Is.stringValue(organizationId)) {
			return organizationId;
		}

		// A pending request supersedes an earlier rejection.
		if (Is.object(requests.pending)) {
			return undefined;
		}

		const latest = requests.latest;
		if (latest?.status === OrganizationRequestStatus.Rejected) {
			throw new UnprocessableError(
				EntityStorageAuthenticationAccountService.CLASS_NAME,
				"organizationRequestRejected",
				{ organization: latest.organization, reason: latest.reason }
			);
		}
		return undefined;
	}

	/**
	 * Store an item for the signed in account. An avatar replaces the avatar of the account, which
	 * stays the default.
	 * @param type The type of the item, not a reserved type, stored in kebab case.
	 * @param data The value of the item.
	 * @param isDefault True to use the item first for its type, clearing any other default.
	 * @returns The unique identifier of the item.
	 * @throws ForbiddenError when the type is reserved, or is a profile owned by the authentication provider.
	 * @throws UnprocessableError when the account holds the most items it may, in all or of the type,
	 * or the value is not valid for the type, such as an avatar that is not a small JPEG.
	 */
	public async create(type: string, data: unknown, isDefault?: boolean): Promise<string> {
		type = AccountDataHelper.normaliseType(type);
		this.guardType(type);
		AccountDataHelper.validateData(type, data, true);
		const accountId = await this.signedInAccount();

		// An account holds one avatar, so a new one replaces it, unless the provider owns it.
		if (type === AuthenticationAccountDataType.Avatar) {
			const avatars = await AccountDataHelper.queryAll(
				this._accountDataEntityStorage,
				accountId,
				type
			);
			for (const item of avatars) {
				this.guardWritable(item);
			}
			if (avatars.length === 0) {
				await this.guardItemLimits(accountId, type);
			}
			return AccountDataHelper.replaceAvatar(
				this._accountDataEntityStorage,
				accountId,
				data,
				avatars
			);
		}

		// A provider owned profile can not be replaced by adding another profile of the type.
		if (EntityStorageAuthenticationAccountService._PROFILE_TYPES.includes(type)) {
			const existing = await AccountDataHelper.getDefault(
				this._accountDataEntityStorage,
				accountId,
				type
			);
			this.guardWritable(existing);
		}
		await this.guardItemLimits(accountId, type);

		return AccountDataHelper.create(
			this._accountDataEntityStorage,
			accountId,
			type,
			data,
			isDefault
		);
	}

	/**
	 * Get an item of the signed in account.
	 * @param id The unique identifier of the item.
	 * @returns The item.
	 * @throws NotFoundError when the item does not exist, belongs to another account or is a node
	 * migration record.
	 */
	public async get(id: string): Promise<IAuthenticationAccountData> {
		const item = await AccountDataHelper.get(
			this._accountDataEntityStorage,
			id,
			await this.signedInAccount()
		);
		// The node migration records are reported as missing, as with the item of another account.
		if (AccountDataHelper.isType(item.type, AccountDataHelper.MIGRATION_TYPE)) {
			throw new NotFoundError(AccountDataHelper.CLASS_NAME, "accountDataNotFound", id);
		}
		return item;
	}

	/**
	 * Replace the value of an item of the signed in account.
	 * @param id The unique identifier of the item.
	 * @param data The new value of the item.
	 * @param isDefault True to use the item first for its type, clearing any other default, unchanged when omitted.
	 * @returns A promise that resolves when the item has been updated.
	 * @throws NotFoundError when the item does not exist or belongs to another account.
	 * @throws ForbiddenError when the item is of a reserved type, or is read only, or is made the
	 * default profile in place of one owned by the authentication provider.
	 * @throws UnprocessableError when the value is not valid for the type.
	 */
	public async update(id: string, data: unknown, isDefault?: boolean): Promise<void> {
		const accountId = await this.signedInAccount();
		const item = await AccountDataHelper.get(this._accountDataEntityStorage, id, accountId);
		this.guardType(item.type);
		this.guardWritable(item);
		AccountDataHelper.validateData(item.type, data, true);
		// A provider owned profile can not be replaced by making another profile the default.
		if (
			isDefault === true &&
			!item.isDefault &&
			AccountDataHelper.isType(
				item.type,
				...EntityStorageAuthenticationAccountService._PROFILE_TYPES
			)
		) {
			this.guardWritable(
				await AccountDataHelper.getDefault(this._accountDataEntityStorage, accountId, item.type)
			);
		}
		await AccountDataHelper.updateItem(this._accountDataEntityStorage, item, data, isDefault);
	}

	/**
	 * Remove an item of the signed in account.
	 * @param id The unique identifier of the item.
	 * @returns A promise that resolves when the item has been removed.
	 * @throws NotFoundError when the item does not exist or belongs to another account.
	 * @throws ForbiddenError when the item is of a reserved type, or is read only.
	 */
	public async remove(id: string): Promise<void> {
		const accountId = await this.signedInAccount();
		const item = await AccountDataHelper.get(this._accountDataEntityStorage, id, accountId);
		this.guardType(item.type);
		this.guardWritable(item);
		await AccountDataHelper.removeItem(this._accountDataEntityStorage, item);
	}

	/**
	 * Query the items of the signed in account, other than the node migration records.
	 * @param type The type of the items to return, all types when omitted.
	 * @param cursor The cursor to request the next page.
	 * @param limit The maximum number of items to return.
	 * @returns The items and a cursor when there are more.
	 */
	public async query(
		type?: string,
		cursor?: string,
		limit?: number
	): Promise<{
		entities: IAuthenticationAccountData[];
		cursor?: string;
	}> {
		const accountId = await this.signedInAccount();
		if (
			Is.stringValue(type) &&
			AccountDataHelper.isType(type, EntityStorageAuthenticationAccountService.MIGRATION_TYPE)
		) {
			return { entities: [] };
		}
		return AccountDataHelper.query(this._accountDataEntityStorage, accountId, type, cursor, limit, [
			EntityStorageAuthenticationAccountService.MIGRATION_TYPE
		]);
	}

	/**
	 * Adopt a DID owned by the caller.
	 * @param identityComponent The identity component.
	 * @param accountId The account id.
	 * @param identity The DID to adopt.
	 * @param proof The proof by the DID over the identity proof document.
	 * @returns The DID.
	 * @internal
	 */
	private async adoptExisting(
		identityComponent: IIdentityComponent,
		accountId: string,
		identity: string,
		proof?: IProof
	): Promise<string> {
		// The cheap checks come before the proof, which resolves the DID, and the caller holds the
		// identity lock of the account, so they are not repeated when the identity is stored.
		await AccountDataHelper.guardNoIdentity(this._accountDataEntityStorage, accountId);
		// The DID is locked as well, so another account can not bind it between the check and the write.
		await this.withDidLock(identity, async () => {
			// A DID the node holds, such as its own or an organization, can not be adopted.
			await AccountDataHelper.guardIdentityAvailable(
				this._accountDataEntityStorage,
				this._organizationEntityStorageType,
				identity
			);
			await IdentityProofHelper.verify(
				identityComponent,
				accountId,
				identity,
				proof,
				this._identityProofMaxAgeSeconds
			);
			await AccountDataHelper.createIdentity(this._accountDataEntityStorage, accountId, identity, {
				accountChecked: true,
				availabilityChecked: true
			});
		});
		return identity;
	}

	/**
	 * Create a self-controlled DID and adopt it.
	 * @param identityComponent The identity component.
	 * @param accountId The account id.
	 * @returns The DID.
	 * @internal
	 */
	private async adoptCreated(
		identityComponent: IIdentityComponent,
		accountId: string
	): Promise<string> {
		// Checked first, so a DID is not created for an account that already has one.
		await AccountDataHelper.guardNoIdentity(this._accountDataEntityStorage, accountId);

		const created = await identityComponent.identityCreate(undefined, undefined, {
			selfControlled: true
		});
		const documentId = created.id;
		if (!Is.stringValue(documentId) || !documentId.startsWith("did:")) {
			throw new GeneralError(
				EntityStorageAuthenticationAccountService.CLASS_NAME,
				"identityCreateFailed"
			);
		}

		try {
			// The account was checked under the lock and the DID was just created, so neither is checked again.
			await AccountDataHelper.createIdentity(
				this._accountDataEntityStorage,
				accountId,
				documentId,
				{
					accountChecked: true,
					availabilityChecked: true
				}
			);
		} catch (error) {
			await identityComponent.identityRemove(
				documentId,
				{ removeKeys: true, removeDocumentKey: true },
				documentId
			);
			throw error;
		}
		return documentId;
	}

	/**
	 * Run a method holding the lock of a DID, taken after the lock of the account.
	 * @param identity The DID.
	 * @param method The method to run.
	 * @returns A promise that resolves when the method has run.
	 * @internal
	 */
	private async withDidLock(identity: string, method: () => Promise<void>): Promise<void> {
		const lockKey = AccountDataHelper.didLockKey(identity);
		await Mutex.lock(lockKey, { throwOnTimeout: true });
		try {
			await method();
		} finally {
			Mutex.unlock(lockKey);
		}
	}

	/**
	 * Issue the membership credentials of the organizations the account was added to before it had
	 * an identity, a failure leaves that membership without one.
	 * @param identityComponent The identity component.
	 * @param accountId The account id.
	 * @param identity The DID just bound to the account.
	 * @returns A promise that resolves when the credentials have been issued.
	 * @internal
	 */
	private async completePendingMemberships(
		identityComponent: IIdentityComponent,
		accountId: string,
		identity: string
	): Promise<void> {
		await PendingMembershipHelper.complete(
			this._accountDataEntityStorage,
			identityComponent,
			this._verificationMethodId,
			accountId,
			identity,
			{ organizationEntityStorageType: this._organizationEntityStorageType, logging: this._logging }
		);
	}

	/**
	 * Export the identity of an account, which is self-controlled so is its own controller.
	 * @param identityComponent The identity component.
	 * @param identity The DID.
	 * @returns The export.
	 * @throws UnprocessableError when the node does not hold the keys of the identity.
	 * @internal
	 */
	private async exportOwnIdentity(
		identityComponent: IIdentityComponent,
		identity: string
	): Promise<IIdentityExport> {
		try {
			return await identityComponent.identityExport(identity, identity);
		} catch (error) {
			throw new UnprocessableError(
				EntityStorageAuthenticationAccountService.CLASS_NAME,
				"identityKeysNotHeld",
				{ identity },
				error
			);
		}
	}

	/**
	 * Undo an identity import that failed, removing the items it created that still belong to the
	 * account and the identity from the node. Each step is attempted on its own, a failure is logged
	 * and the error of the import is the one reported.
	 * @param identityComponent The identity component.
	 * @param accountId The account id.
	 * @param identity The imported DID.
	 * @param created The ids of the items the import created.
	 * @returns A promise that resolves when the import has been undone.
	 * @internal
	 */
	private async rollbackImport(
		identityComponent: IIdentityComponent,
		accountId: string,
		identity: string,
		created: string[]
	): Promise<void> {
		for (const id of created) {
			try {
				// Only an item that still belongs to the account is removed.
				await AccountDataHelper.remove(this._accountDataEntityStorage, id, accountId);
			} catch (error) {
				await this.logRollbackFailure(accountId, error);
			}
		}
		try {
			// A ledger document stays published, so the export can be imported again.
			await identityComponent.identityRemove(
				identity,
				{ removeKeys: true, removeDocumentKey: true, retainDocument: true },
				identity
			);
		} catch (error) {
			await this.logRollbackFailure(accountId, error);
		}
	}

	/**
	 * Log a step of undoing an identity import that failed.
	 * @param accountId The account id.
	 * @param error The error of the step.
	 * @returns A promise that resolves when the failure has been logged.
	 * @internal
	 */
	private async logRollbackFailure(accountId: string, error: unknown): Promise<void> {
		await this._logging?.log({
			level: "warn",
			source: EntityStorageAuthenticationAccountService.CLASS_NAME,
			ts: Date.now(),
			message: "identityImportRollbackFailed",
			error: BaseError.fromError(error),
			data: { accountId }
		});
	}

	/**
	 * Refuse an item when the account holds the most items it may, in all or of the type.
	 * @param accountId The account id.
	 * @param type The normalised type of the item.
	 * @returns A promise that resolves when the item may be stored.
	 * @throws UnprocessableError when a limit is reached.
	 * @internal
	 */
	private async guardItemLimits(accountId: string, type: string): Promise<void> {
		const maxOfType = this._maxItemsByType[type];
		const [count, countOfType] = await Promise.all([
			AccountDataHelper.count(this._accountDataEntityStorage, accountId),
			Is.integer(maxOfType)
				? AccountDataHelper.count(this._accountDataEntityStorage, accountId, type)
				: undefined
		]);
		if (count >= this._maxItems) {
			throw new UnprocessableError(
				EntityStorageAuthenticationAccountService.CLASS_NAME,
				"accountDataLimitReached",
				{ maxItems: this._maxItems }
			);
		}
		if (Is.integer(maxOfType) && Is.integer(countOfType) && countOfType >= maxOfType) {
			throw new UnprocessableError(
				EntityStorageAuthenticationAccountService.CLASS_NAME,
				"accountDataTypeLimitReached",
				{ type, maxItems: maxOfType }
			);
		}
	}

	/**
	 * Get a rate limit from its configuration, every limit has a fifteen minute window by default.
	 * @param configured The configured limit.
	 * @param maxAttempts The default attempts in the window.
	 * @returns The limit.
	 * @internal
	 */
	private rateLimit(
		configured: IAuthenticationRateActionConfig | undefined,
		maxAttempts: number
	): IAuthenticationRateActionConfig {
		return {
			maxAttempts: configured?.maxAttempts ?? maxAttempts,
			windowMinutes: configured?.windowMinutes ?? 15
		};
	}

	/**
	 * Get the identity component.
	 * @returns The component.
	 * @throws GeneralError when it does not exist.
	 * @internal
	 */
	private requireIdentityComponent(): IIdentityComponent {
		if (Is.empty(this._identityComponent)) {
			throw new GeneralError(
				EntityStorageAuthenticationAccountService.CLASS_NAME,
				"identityComponentMissing"
			);
		}
		return this._identityComponent;
	}

	/**
	 * Get the DID of an account.
	 * @param accountId The account id.
	 * @returns The DID.
	 * @throws NotFoundError when the account has no identity.
	 * @internal
	 */
	private async requireIdentity(accountId: string): Promise<string> {
		const identity = await OrganizationMembershipHelper.loadIdentity(
			this._accountDataEntityStorage,
			accountId
		);
		if (!Is.stringValue(identity)) {
			throw new NotFoundError(
				EntityStorageAuthenticationAccountService.CLASS_NAME,
				"identityNotFound",
				accountId
			);
		}
		return identity;
	}

	/**
	 * Check an identity export before importing it, without putting it in an error, as it holds keys.
	 * @param exported The export.
	 * @returns The DID of the identity.
	 * @throws UnprocessableError when the export is not valid or not self-controlled.
	 * @internal
	 */
	private guardIdentityExport(exported: IAccountIdentityExport): string {
		const identity: unknown =
			Is.object<IAccountIdentityExport>(exported) && Is.object(exported.identity)
				? exported.identity.document?.id
				: undefined;
		if (
			!Is.stringValue(identity) ||
			!identity.startsWith("did:") ||
			!(Is.undefined(exported.credentials) || Is.array(exported.credentials))
		) {
			throw new UnprocessableError(
				EntityStorageAuthenticationAccountService.CLASS_NAME,
				"identityExportInvalid"
			);
		}
		// The identity of an account is self-controlled, so it can be moved between nodes.
		if (!exported.identity.selfControlled) {
			throw new UnprocessableError(
				EntityStorageAuthenticationAccountService.CLASS_NAME,
				"identityNotSelfControlled",
				{ identity }
			);
		}
		if ((exported.credentials?.length ?? 0) > this._identityImportMaxCredentials) {
			throw new UnprocessableError(
				EntityStorageAuthenticationAccountService.CLASS_NAME,
				"identityImportTooManyCredentials",
				{ maxCredentials: this._identityImportMaxCredentials }
			);
		}
		return identity;
	}

	/**
	 * Store the credentials of an imported identity that verify and are issued to it, and add the
	 * account to the registered organizations whose revocable membership credentials it holds. A
	 * membership credential without a revocation status is stored as a credential only, as ending
	 * the membership could not revoke it.
	 * @param identityComponent The identity component.
	 * @param accountId The account id.
	 * @param identity The imported DID.
	 * @param credentials The credentials of the export.
	 * @param created The ids of the items created, added to so they can be removed on failure.
	 * @returns What was imported.
	 * @internal
	 */
	private async importCredentials(
		identityComponent: IIdentityComponent,
		accountId: string,
		identity: string,
		credentials: unknown[],
		created: string[]
	): Promise<IAccountIdentityImportResult> {
		const [existingCredentials, existingOrganizations, contextIds] = await Promise.all([
			MembershipRemovalHelper.loadCredentialItems(this._accountDataEntityStorage, accountId),
			OrganizationMembershipHelper.loadOrganizations(this._accountDataEntityStorage, accountId),
			ContextIdStore.getContextIds()
		]);
		// Credentials are compared as JSON, so they are not stored twice.
		const stored = new Set<string>();
		for (const item of existingCredentials) {
			const credential = AuthenticationAccountHelper.getCredential(item.data);
			if (Is.object(credential)) {
				stored.add(this.credentialKey(credential));
			}
		}
		const joined = new Set<string>();
		for (const item of existingOrganizations) {
			const organization = AuthenticationAccountHelper.getOrganization(item.data);
			if (Is.stringValue(organization)) {
				joined.add(organization);
			}
		}
		// Each issuer is looked up once.
		const registered = new Map<string, Promise<boolean>>();
		const tenantOrganization = contextIds?.[ContextIdKeys.Organization];
		const organizations: string[] = [];
		let credentialsImported = 0;
		let credentialsSkipped = 0;

		// The credentials are verified a few at a time, then stored in the order of the export.
		const results: (
			| { credential: IDidVerifiableCredential; memberOf?: string; revocationIndex?: number }
			| undefined
		)[] = [];
		const concurrency = EntityStorageAuthenticationAccountService._VERIFY_CONCURRENCY;
		for (let start = 0; start < credentials.length; start += concurrency) {
			results.push(
				...(await Promise.all(
					credentials
						.slice(start, start + concurrency)
						.map(async credential =>
							this.verifyCredentialFor(identityComponent, credential, identity)
						)
				))
			);
		}

		for (const verified of results) {
			if (!Is.object(verified)) {
				credentialsSkipped++;
			} else {
				credentialsImported++;
				await this.storeImportedCredential(
					accountId,
					verified.credential,
					verified,
					{ stored, joined, registered, tenantOrganization, organizations },
					created
				);
			}
		}

		return { identity, credentialsImported, credentialsSkipped, organizations };
	}

	/**
	 * Store a verified credential of an imported identity, and the membership it shows.
	 * @param accountId The account id.
	 * @param credential The credential.
	 * @param verified What the verification showed.
	 * @param verified.memberOf The organization the credential shows membership of.
	 * @param verified.revocationIndex The revocation index of its verified status.
	 * @param state The state of the import.
	 * @param state.stored The keys of the credentials stored.
	 * @param state.joined The organizations joined.
	 * @param state.registered The lookups of registered organizations made.
	 * @param state.tenantOrganization The organization of the tenant.
	 * @param state.organizations The organizations the import joined.
	 * @param created The ids of the items created, added to so they can be removed on failure.
	 * @returns A promise that resolves when the credential has been stored.
	 * @internal
	 */
	private async storeImportedCredential(
		accountId: string,
		credential: IDidVerifiableCredential,
		verified: { memberOf?: string; revocationIndex?: number },
		state: {
			stored: Set<string>;
			joined: Set<string>;
			registered: Map<string, Promise<boolean>>;
			tenantOrganization: string | undefined;
			organizations: string[];
		},
		created: string[]
	): Promise<void> {
		const key = this.credentialKey(credential);
		if (!state.stored.has(key)) {
			created.push(
				await AccountDataHelper.create(
					this._accountDataEntityStorage,
					accountId,
					AuthenticationAccountDataType.VerifiableCredential,
					credential
				)
			);
			state.stored.add(key);
		}

		// Only plain membership is restored, an organization role is never given by an import. The
		// index was chosen by the organization that signed the credential, so it is recorded to revoke
		// the credential when the membership ends.
		const organization = verified.memberOf;
		if (
			Is.stringValue(organization) &&
			Is.integer(verified.revocationIndex) &&
			!state.joined.has(organization) &&
			(await this.isRegisteredOrganization(
				organization,
				state.registered,
				state.tenantOrganization
			))
		) {
			created.push(
				await AccountDataHelper.create(
					this._accountDataEntityStorage,
					accountId,
					AuthenticationAccountDataType.Organization,
					AuthenticationAccountHelper.createOrganizationData(organization),
					state.joined.size === 0,
					undefined,
					{ revocationIndex: verified.revocationIndex }
				)
			);
			state.joined.add(organization);
			state.organizations.push(organization);
		}
	}

	/**
	 * Get the key a credential is compared by, its JSON.
	 * @param credential The credential.
	 * @returns The key.
	 * @internal
	 */
	private credentialKey(credential: IDidVerifiableCredential): string {
		return JSON.stringify(credential);
	}

	/**
	 * Verify a credential in full and check it is issued to an identity, a value that is not a JSON
	 * credential that could be stored as account data, such as a JWT, is not valid.
	 * @param identityComponent The identity component.
	 * @param credential The credential from the export.
	 * @param identity The DID the credential must be issued to.
	 * @returns The credential, the organization it shows membership of, when its issuer, and the
	 * revocation index of its verified revocation status, or undefined when the credential is not
	 * valid for the identity.
	 * @internal
	 */
	private async verifyCredentialFor(
		identityComponent: IIdentityComponent,
		credential: unknown,
		identity: string
	): Promise<
		| { credential: IDidVerifiableCredential; memberOf?: string; revocationIndex?: number }
		| undefined
	> {
		const jsonCredential = AuthenticationAccountHelper.getCredential(credential);
		if (Is.undefined(jsonCredential)) {
			return undefined;
		}
		let result: Awaited<ReturnType<IIdentityComponent["verifiableCredentialVerify"]>>;
		try {
			result = await identityComponent.verifiableCredentialVerify(jsonCredential);
		} catch {
			// A credential that does not verify is skipped.
			return undefined;
		}
		const vc = result.verifiableCredential;
		if (result.revoked || !Is.object(vc)) {
			return undefined;
		}
		const subjects = AuthenticationAccountHelper.getCredentialSubjects(vc).filter(
			subject => subject.id === identity
		);
		if (subjects.length === 0) {
			return undefined;
		}

		const issuer = AuthenticationAccountHelper.getCredentialIssuer(vc);
		const isMembership =
			Is.stringValue(issuer) &&
			subjects.some(subject =>
				(Is.array(subject.memberOf) ? subject.memberOf : [subject.memberOf]).some(
					member => Is.object<{ id?: unknown }>(member) && member.id === issuer
				)
			);

		// The status comes from the verified credential, which the verification checked is not revoked.
		return {
			credential: jsonCredential,
			memberOf: isMembership ? issuer : undefined,
			revocationIndex: AuthenticationAccountHelper.getCredentialRevocationIndex(vc)
		};
	}

	/**
	 * Check whether an organization is registered on the node, or is the organization of the tenant.
	 * @param organization The DID of the organization.
	 * @param memo The lookups already made, by DID.
	 * @param tenantOrganization The organization of the tenant.
	 * @returns True when it is.
	 * @internal
	 */
	private async isRegisteredOrganization(
		organization: string,
		memo: Map<string, Promise<boolean>>,
		tenantOrganization: string | undefined
	): Promise<boolean> {
		if (tenantOrganization === organization) {
			return true;
		}
		let lookup = memo.get(organization);
		if (Is.empty(lookup)) {
			lookup = this.findRegisteredOrganization(organization);
			memo.set(organization, lookup);
		}
		return lookup;
	}

	/**
	 * Check whether an organization is registered on the node.
	 * @param organization The DID of the organization.
	 * @returns True when it is.
	 * @internal
	 */
	private async findRegisteredOrganization(organization: string): Promise<boolean> {
		return Is.object(
			await OrganizationHelper.findRegistered(this._organizationEntityStorageType, organization)
		);
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
				EntityStorageAuthenticationAccountService.CLASS_NAME,
				"identityRemoveFailed",
				{ identity },
				error
			);
		}
	}

	/**
	 * Check whether an account has an identity, using the identity the account processor set on the
	 * request when there is one.
	 * @param accountId The account id.
	 * @param contextIdentity The identity of the request.
	 * @returns True when the account has an identity.
	 * @internal
	 */
	private async hasIdentity(accountId: string, contextIdentity?: string): Promise<boolean> {
		if (Is.stringValue(contextIdentity)) {
			return true;
		}
		const identity = await AccountDataHelper.getDefault(
			this._accountDataEntityStorage,
			accountId,
			AuthenticationAccountDataType.Identity
		);
		return Is.object(identity);
	}

	/**
	 * Get the account of the request.
	 * @returns The account id.
	 * @throws GuardError when the request is not signed in.
	 * @internal
	 */
	private async signedInAccount(): Promise<string> {
		const contextIds = await ContextIdStore.getContextIds();
		ContextIdHelper.guard(contextIds, ContextIdKeys.Account);
		return contextIds[ContextIdKeys.Account];
	}

	/**
	 * Refuse the types the account may not set itself.
	 * @param type The type of the item.
	 * @throws ForbiddenError when the type is reserved.
	 * @internal
	 */
	private guardType(type: string): void {
		if (
			AccountDataHelper.isType(type, ...EntityStorageAuthenticationAccountService.RESERVED_TYPES)
		) {
			throw new ForbiddenError(
				EntityStorageAuthenticationAccountService.CLASS_NAME,
				"reservedType",
				{
					type
				}
			);
		}
	}

	/**
	 * Refuse to change an item the account may not change, such as a profile owned by the
	 * authentication provider.
	 * @param item The item.
	 * @throws ForbiddenError when the item is read only.
	 * @internal
	 */
	private guardWritable(item?: IAuthenticationAccountData): void {
		if (Is.object(item) && AuthenticationAccountHelper.isReadOnly(item.data)) {
			throw new ForbiddenError(EntityStorageAuthenticationAccountService.CLASS_NAME, "readOnly", {
				type: item.type
			});
		}
	}
}
