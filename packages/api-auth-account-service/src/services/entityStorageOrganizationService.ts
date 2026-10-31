// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import {
	AuthenticationAccountDataType,
	ExportFileHelper,
	ExportFileType,
	type IAuthenticationRateActionConfig,
	type IAuthenticationRateComponent,
	type IOrganization,
	type IOrganizationComponent,
	type IOrganizationCreate,
	type IOrganizationIdentityExport,
	type IOrganizationRequest,
	OrganizationRequestStatus,
	RecentSignInHelper
} from "@3sixty/api-auth-models";
import { ForbiddenError } from "@3sixty/api-models";
import type { IAuthorizationComponent } from "@3sixty/authorization-models";
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
	UnprocessableError
} from "@3sixty/core";
import { ComparisonOperator, LogicalOperator, SortDirection } from "@3sixty/entity";
import {
	EntityStorageConnectorFactory,
	type IEntityStorageConnector
} from "@3sixty/entity-storage-models";
import { Did, type IIdentityComponent, type IIdentityExport } from "@3sixty/identity-models";
import type { ILoggingComponent } from "@3sixty/logging-models";
import { nameof } from "@3sixty/nameof";
import { DidVerificationMethodType, type IProof } from "@3sixty/standards-w3c-did";
import { EntityStorageAuthenticationAccountService } from "./entityStorageAuthenticationAccountService.js";
import type { AccountData } from "../entities/accountData.js";
import type { Organization } from "../entities/organization.js";
import type { OrganizationRequest } from "../entities/organizationRequest.js";
import type { IEntityStorageOrganizationServiceConstructorOptions } from "../models/IEntityStorageOrganizationServiceConstructorOptions.js";
import { AccountDataHelper } from "../utils/accountDataHelper.js";
import { AdminScopeHelper } from "../utils/adminScopeHelper.js";
import { IdentityProofHelper } from "../utils/identityProofHelper.js";
import { MembershipRemovalHelper } from "../utils/membershipRemovalHelper.js";
import { OrganizationHelper } from "../utils/organizationHelper.js";
import { OrganizationRequestHelper } from "../utils/organizationRequestHelper.js";
import { PendingMembershipHelper } from "../utils/pendingMembershipHelper.js";

/**
 * Manages the organizations registered on the node using entity storage, their profiles are held as
 * account data owned by the organization id. Callers holding escalated privilege or the member
 * admin role manage every organization of the tenant.
 */
export class EntityStorageOrganizationService implements IOrganizationComponent {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<EntityStorageOrganizationService>();

	/**
	 * The default role whose holders manage every organization of the tenant.
	 */
	public static readonly DEFAULT_MEMBER_ADMIN_ROLE: string = "user-admin";

	/**
	 * The default role that grants escalated privilege.
	 */
	public static readonly DEFAULT_ESCALATED_PRIVILEGE_ROLE: string = "global-admin";

	/**
	 * The default authorization model ID used to look up and give roles.
	 */
	public static readonly DEFAULT_AUTHORIZATION_MODEL_ID: string = "system";

	/**
	 * The rate limit action for exporting the identity of an organization.
	 */
	public static readonly RATE_ACTION_EXPORT_IDENTITY: string = "export-organization-identity";

	/**
	 * The i18n key of the reason given for the pending requests to join an organization that is
	 * removed, for the client to translate.
	 */
	public static readonly REASON_ORGANIZATION_REMOVED: string =
		"organizationRequest.reason.organizationRemoved";

	/**
	 * The rate limit action for creating an organization from an identity export.
	 */
	public static readonly RATE_ACTION_IMPORT_IDENTITY: string = "import-organization-identity";

	/**
	 * The number of organizations a search returns by default.
	 * @internal
	 */
	private static readonly _SEARCH_LIMIT: number = 10;

	/**
	 * The most organizations a search returns.
	 * @internal
	 */
	private static readonly _SEARCH_LIMIT_MAX: number = 25;

	/**
	 * The entity storage for the organizations.
	 * @internal
	 */
	private readonly _organizationEntityStorage: IEntityStorageConnector<Organization>;

	/**
	 * The entity storage type of the organizations, which hold the revocation index counters.
	 * @internal
	 */
	private readonly _organizationEntityStorageType: string;

	/**
	 * The entity storage for the requests to join an organization, when it exists.
	 * @internal
	 */
	private readonly _organizationRequestEntityStorage?: IEntityStorageConnector<OrganizationRequest>;

	/**
	 * The logging component, when it exists.
	 * @internal
	 */
	private readonly _logging?: ILoggingComponent;

	/**
	 * The entity storage for account data.
	 * @internal
	 */
	private readonly _accountDataEntityStorage: IEntityStorageConnector<AccountData>;

	/**
	 * The identity component, when it exists.
	 * @internal
	 */
	private readonly _identityComponent?: IIdentityComponent;

	/**
	 * How long an organization identity proof may be used for after it was created, in seconds.
	 * @internal
	 */
	private readonly _identityProofMaxAgeSeconds: number;

	/**
	 * The authorization component.
	 * @internal
	 */
	private readonly _authorizationComponent?: IAuthorizationComponent;

	/**
	 * The verification method added to a created organization DID.
	 * @internal
	 */
	private readonly _verificationMethodId: string;

	/**
	 * The role whose holders manage every organization of the tenant.
	 * @internal
	 */
	private readonly _memberAdminRole: string;

	/**
	 * The role that grants escalated privilege.
	 * @internal
	 */
	private readonly _escalatedPrivilegeRole: string;

	/**
	 * The authorization model ID used to look up and give roles.
	 * @internal
	 */
	private readonly _authorizationModelId: string;

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
	 * How long ago the session of the caller may have started for exporting an identity, in seconds.
	 * @internal
	 */
	private readonly _recentSignInSeconds: number;

	/**
	 * Create a new instance of EntityStorageOrganizationService.
	 * @param options The options for the service.
	 */
	constructor(options?: IEntityStorageOrganizationServiceConstructorOptions) {
		this._organizationEntityStorageType =
			options?.organizationEntityStorageType ?? OrganizationHelper.DEFAULT_ENTITY_STORAGE_TYPE;
		this._organizationEntityStorage = EntityStorageConnectorFactory.get(
			this._organizationEntityStorageType
		);
		this._organizationRequestEntityStorage = EntityStorageConnectorFactory.getIfExists<
			IEntityStorageConnector<OrganizationRequest>
		>(options?.organizationRequestEntityStorageType ?? "organization-request");
		this._logging = ComponentFactory.getIfExists<ILoggingComponent>(
			options?.loggingComponentType ?? "logging"
		);
		this._accountDataEntityStorage = EntityStorageConnectorFactory.get(
			options?.accountDataEntityStorageType ?? "account-data"
		);
		this._identityComponent = ComponentFactory.getIfExists<IIdentityComponent>(
			options?.identityComponentType ?? "identity-service"
		);
		this._identityProofMaxAgeSeconds =
			options?.config?.identityProofMaxAgeSeconds ?? IdentityProofHelper.DEFAULT_MAX_AGE_SECONDS;
		this._authorizationComponent = ComponentFactory.getIfExists<IAuthorizationComponent>(
			options?.authorizationComponentType ?? "authorization"
		);
		this._verificationMethodId =
			options?.config?.verificationMethodId ??
			EntityStorageAuthenticationAccountService.DEFAULT_VERIFICATION_METHOD_ID;
		this._memberAdminRole =
			options?.config?.memberAdminRole ??
			EntityStorageOrganizationService.DEFAULT_MEMBER_ADMIN_ROLE;
		this._escalatedPrivilegeRole =
			options?.config?.escalatedPrivilegeRole ??
			EntityStorageOrganizationService.DEFAULT_ESCALATED_PRIVILEGE_ROLE;
		this._authorizationModelId =
			options?.config?.authorizationModelId ??
			EntityStorageOrganizationService.DEFAULT_AUTHORIZATION_MODEL_ID;
		this._authenticationRateService = ComponentFactory.getIfExists<IAuthenticationRateComponent>(
			options?.authenticationRateServiceType ?? "authentication-rate"
		);
		this._rateLimits = {
			[EntityStorageOrganizationService.RATE_ACTION_EXPORT_IDENTITY]: {
				maxAttempts: options?.config?.exportIdentityRateLimit?.maxAttempts ?? 5,
				windowMinutes: options?.config?.exportIdentityRateLimit?.windowMinutes ?? 15
			},
			[EntityStorageOrganizationService.RATE_ACTION_IMPORT_IDENTITY]: {
				maxAttempts: options?.config?.importIdentityRateLimit?.maxAttempts ?? 5,
				windowMinutes: options?.config?.importIdentityRateLimit?.windowMinutes ?? 15
			}
		};
		this._recentSignInSeconds =
			options?.config?.recentSignInSeconds ?? RecentSignInHelper.DEFAULT_MAX_AGE_SECONDS;
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return EntityStorageOrganizationService.CLASS_NAME;
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
	 * Create an organization, only admins may. A node controlled DID with the trust verification
	 * method is created when no DID is given, an existing DID needs a proof by it unless the call is
	 * a system call. The signed in caller is the first member, the organization becomes its default
	 * when it has none, no role is given as creating an organization already needs the member admin
	 * role or escalated privilege. A system call, such as from the node CLI, has no account so the
	 * organization is created without members, firstMemberAccountId is ignored. An identity export
	 * may be given instead, it is imported controlled by the node and removed again when the
	 * organization can not be registered.
	 * @param organization The details of the organization.
	 * @returns The organization.
	 * @throws ForbiddenError when the caller is not an admin.
	 * @throws ConflictError when the DID is already registered or held by an account or the node.
	 * @throws UnauthorizedError when a required proof does not verify.
	 * @throws UnprocessableError when an identity export is given with an identity or proof, or is
	 * not valid.
	 * @throws TooManyRequestsError when the caller imports too often.
	 */
	public async create(organization: IOrganizationCreate): Promise<IOrganization> {
		Guards.object<IOrganizationCreate>(
			EntityStorageOrganizationService.CLASS_NAME,
			nameof(organization),
			organization
		);
		if (!Is.undefined(organization.identity)) {
			Did.guard(
				EntityStorageOrganizationService.CLASS_NAME,
				nameof(organization.identity),
				organization.identity
			);
		}
		const identityImport = organization.identityImport;
		if (
			!Is.undefined(identityImport) &&
			(!Is.undefined(organization.identity) || !Is.undefined(organization.proof))
		) {
			throw new UnprocessableError(
				EntityStorageOrganizationService.CLASS_NAME,
				"identityImportExclusive"
			);
		}
		let importedRevocationIndex: number | undefined;
		if (!Is.undefined(identityImport)) {
			// Checked before anything else, so the wrong kind of file is refused at once.
			ExportFileHelper.guard(identityImport, ExportFileType.OrganizationIdentity);
			importedRevocationIndex = identityImport.nextRevocationIndex;
			if (
				!Is.undefined(importedRevocationIndex) &&
				(!Is.integer(importedRevocationIndex) || importedRevocationIndex < 0)
			) {
				throw new UnprocessableError(
					EntityStorageOrganizationService.CLASS_NAME,
					"nextRevocationIndexInvalid"
				);
			}
		}
		await this.guardAdmin();
		// The first member is always the caller, never an account named in the request, so an admin
		// can not add another account, or one holding escalated privilege, as an admin.
		const firstMemberAccountId = await AdminScopeHelper.callerAccount();
		const existingIdentity = organization.identity;
		if (Is.stringValue(existingIdentity)) {
			await this.guardExistingIdentity(existingIdentity, firstMemberAccountId, organization.proof);
		}

		// The DID the node created or imported for the organization, removed again when creating the
		// organization fails, with its controller and whether it was imported.
		let held: { controller: string; imported: boolean } | undefined;
		let identity: string;
		if (Is.object(identityImport)) {
			const imported = await this.importIdentity(identityImport.identity, firstMemberAccountId);
			identity = imported.identity;
			held = { controller: imported.controller, imported: true };
		} else if (Is.stringValue(existingIdentity)) {
			identity = existingIdentity;
		} else {
			identity = await this.createIdentity();
			held = { controller: await this.nodeIdentity(), imported: false };
		}

		let stored: Organization | undefined;
		try {
			// The DID may have issued credentials before, when exported from another node or registered
			// here before, so the counter carries on from the highest index it reached.
			const retiredRevocationIndex = await OrganizationHelper.getRetiredRevocationIndex(
				this._accountDataEntityStorage,
				identity
			);
			stored = await this.register(
				identity,
				organization.publicProfile,
				Is.object(held),
				Math.max(retiredRevocationIndex ?? 0, importedRevocationIndex ?? 0)
			);
			// A created DID has no profiles yet, an existing or imported one may.
			await this.storeProfiles(
				identity,
				organization.publicProfile,
				organization.privateProfile,
				!Is.stringValue(existingIdentity) && !Is.object(identityImport)
			);

			// No role is granted, the first member is the caller, who already holds the member admin
			// role or escalated privilege to create an organization, and granting a role to yourself is
			// refused.
			if (Is.stringValue(firstMemberAccountId)) {
				await PendingMembershipHelper.add(
					this._accountDataEntityStorage,
					this._identityComponent,
					this._verificationMethodId,
					firstMemberAccountId,
					identity,
					undefined,
					this._organizationEntityStorageType
				);
			}
		} catch (error) {
			await this.rollbackCreate(identity, stored, held, firstMemberAccountId);
			throw error;
		}

		return {
			...this.toOrganization(stored),
			publicProfile: organization.publicProfile,
			privateProfile: organization.privateProfile
		};
	}

	/**
	 * Get an organization, the private profile is only included for its members and admins.
	 * @param id The unique identifier or the DID of the organization.
	 * @returns The organization.
	 * @throws NotFoundError when the organization is not registered.
	 */
	public async get(id: string): Promise<IOrganization> {
		const organization = await this.getOrganization(id);

		const [canReadPrivate, publicProfile] = await Promise.all([
			this.canReadPrivate(organization.identity),
			AccountDataHelper.getDefault(
				this._accountDataEntityStorage,
				organization.identity,
				AuthenticationAccountDataType.PublicProfile
			)
		]);
		const privateProfile = canReadPrivate
			? await AccountDataHelper.getDefault(
					this._accountDataEntityStorage,
					organization.identity,
					AuthenticationAccountDataType.PrivateProfile
				)
			: undefined;

		return {
			...this.toOrganization(organization),
			publicProfile: publicProfile?.data as IOrganization["publicProfile"],
			privateProfile: privateProfile?.data as IOrganization["privateProfile"]
		};
	}

	/**
	 * Query the organizations, the earliest first, only admins may.
	 * @param cursor The cursor to request the next page.
	 * @param limit The maximum number of organizations to return.
	 * @returns The organizations, without their profiles, and a cursor when there are more.
	 * @throws ForbiddenError when the caller is not an admin.
	 */
	public async query(
		cursor?: string,
		limit?: number
	): Promise<{
		entities: IOrganization[];
		cursor?: string;
	}> {
		await this.guardAdmin();
		const result = await this._organizationEntityStorage.query(
			undefined,
			undefined,
			undefined,
			cursor,
			limit
		);
		return {
			entities: (result.entities as Organization[]).map(item => this.toOrganization(item)),
			cursor: result.cursor
		};
	}

	/**
	 * Search the organizations whose name starts with the text given, without case, any signed in
	 * account may.
	 * @param name The start of the name.
	 * @param limit The maximum number of organizations to return.
	 * @returns The organizations with their public profiles.
	 */
	public async search(
		name: string,
		limit?: number
	): Promise<{
		entities: IOrganization[];
	}> {
		Guards.stringValue(EntityStorageOrganizationService.CLASS_NAME, nameof(name), name);
		const searchName = OrganizationHelper.searchName({ name });
		if (!Is.stringValue(searchName)) {
			return { entities: [] };
		}
		const result = await this._organizationEntityStorage.query(
			{
				property: "searchName",
				value: searchName,
				comparison: ComparisonOperator.StartsWith
			},
			undefined,
			undefined,
			undefined,
			Math.min(
				Math.max(limit ?? EntityStorageOrganizationService._SEARCH_LIMIT, 1),
				EntityStorageOrganizationService._SEARCH_LIMIT_MAX
			)
		);

		// Storage may compare with case, so the start is checked again here.
		const matches = (result.entities as Organization[]).filter(organization =>
			organization.searchName.startsWith(searchName)
		);
		const publicProfiles = await this.findPublicProfiles(
			matches.map(organization => organization.identity)
		);
		return {
			entities: matches.map(organization => ({
				...this.toOrganization(organization),
				publicProfile: publicProfiles.get(organization.identity)
			}))
		};
	}

	/**
	 * Replace the profiles of an organization, the profiles omitted are unchanged, only admins may.
	 * @param id The unique identifier or the DID of the organization.
	 * @param publicProfile The profile shown to others.
	 * @param privateProfile The profile only shown to the members and admins.
	 * @returns A promise that resolves when the profiles have been replaced.
	 * @throws NotFoundError when the organization is not registered.
	 * @throws ForbiddenError when the caller is not an admin.
	 */
	public async update(
		id: string,
		publicProfile?: IOrganization["publicProfile"],
		privateProfile?: IOrganization["privateProfile"]
	): Promise<void> {
		await this.guardAdmin();
		const organization = await this.getOrganization(id);

		await this.storeProfiles(organization.identity, publicProfile, privateProfile, false);
		// Read again before writing, so a revocation index allocated meanwhile is kept.
		await OrganizationHelper.updateOrganization(
			this._organizationEntityStorage,
			organization.identity,
			current => ({
				...current,
				searchName: Is.object(publicProfile)
					? OrganizationHelper.searchName(publicProfile)
					: current.searchName
			})
		);
	}

	/**
	 * Export the identity of an organization with its private keys, only admins may, and only for an
	 * organization whose keys the node holds, such as one it created or imported. The DID of the node
	 * and of the organization of the tenant are never exported.
	 * @param id The unique identifier or the DID of the organization.
	 * @param sessionStart When the session of the caller started in seconds, it must be recent.
	 * @returns The export with the revocation index the organization reached, which contains private
	 * keys and must be protected.
	 * @throws ForbiddenError when the caller is not an admin, or the organization is the node or the
	 * organization of the tenant.
	 * @throws UnauthorizedError when the session did not start recently.
	 * @throws NotFoundError when the organization is not registered.
	 * @throws UnprocessableError when the node does not hold the keys of the organization.
	 * @throws TooManyRequestsError when the caller exports too often.
	 */
	public async exportIdentity(
		id: string,
		sessionStart?: number
	): Promise<IOrganizationIdentityExport> {
		await this.guardAdmin();
		const callerAccountId = await AdminScopeHelper.callerAccount();
		// A system call, such as from the node CLI, has no session.
		if (Is.stringValue(callerAccountId)) {
			RecentSignInHelper.guard(sessionStart, this._recentSignInSeconds);
			await this._authenticationRateService?.check(
				EntityStorageOrganizationService.RATE_ACTION_EXPORT_IDENTITY,
				callerAccountId
			);
		}
		const organization = await this.getOrganization(id);
		const contextIds = await ContextIdStore.getContextIds();
		if (
			organization.identity === contextIds?.[ContextIdKeys.Node] ||
			organization.identity === contextIds?.[ContextIdKeys.Organization]
		) {
			throw new ForbiddenError(
				EntityStorageOrganizationService.CLASS_NAME,
				"nodeIdentityExportNotPermitted",
				{ identity: organization.identity }
			);
		}
		const identityComponent = this.requireIdentityComponent();
		let identity: IIdentityExport;
		try {
			identity = await identityComponent.identityExport(
				organization.identity,
				await this.nodeIdentity()
			);
		} catch (error) {
			throw new UnprocessableError(
				EntityStorageOrganizationService.CLASS_NAME,
				"identityKeysNotHeld",
				{ identity: organization.identity },
				error
			);
		}
		// Read again after the export, so the export never carries an index below one already given.
		const current = await this._organizationEntityStorage.get(organization.id);
		return {
			type: ExportFileType.OrganizationIdentity,
			version: ExportFileHelper.VERSION,
			identity,
			nextRevocationIndex:
				(Is.object<Organization>(current) ? current : organization).nextRevocationIndex ?? 0
		};
	}

	/**
	 * Remove an organization and its profiles, only admins may, and only when no account is a member.
	 * The keys of a DID the node created or imported for the organization are removed with it, a DID
	 * registered as an existing identity is left, as the node does not hold it. The pending requests
	 * to join it are rejected, with the reason organizationRequest.reason.organizationRemoved.
	 * @param id The unique identifier or the DID of the organization.
	 * @returns A promise that resolves when the organization has been removed.
	 * @throws NotFoundError when the organization is not registered.
	 * @throws ForbiddenError when the caller is not an admin.
	 * @throws ConflictError when an account is a member of the organization.
	 * @throws GeneralError when removing the keys of the organization fails, the organization is kept.
	 */
	public async remove(id: string): Promise<void> {
		await this.guardAdmin();
		const organization = await this.getOrganization(id);

		if (await this.hasMembers(organization.identity)) {
			throw new ConflictError(
				EntityStorageOrganizationService.CLASS_NAME,
				"organizationHasMembers",
				organization.identity
			);
		}

		// The keys are removed first, so a failure leaves the organization to be removed again.
		if (organization.identityHeld === true) {
			await this.removeHeldIdentity(organization.identity);
		}
		await this.removeProfiles(organization.identity);
		await this.rejectPendingRequests(organization.identity);
		await this.retireRevocationIndex(organization);
		await this._organizationEntityStorage.remove(organization.id);
	}

	/**
	 * Reject the pending requests to join an organization that is removed, so each account sees why
	 * it was not let in rather than waiting on a request no one can answer.
	 * @param identity The DID of the organization.
	 * @returns A promise that resolves when the requests have been rejected.
	 * @internal
	 */
	private async rejectPendingRequests(identity: string): Promise<void> {
		const storage = this._organizationRequestEntityStorage;
		if (Is.empty(storage)) {
			return;
		}
		// Collected first, as rejecting a request takes it out of the pending pages being read.
		const pending: IOrganizationRequest[] = [];
		let cursor: string | undefined;
		do {
			const page = await OrganizationRequestHelper.query(
				storage,
				OrganizationRequestStatus.Pending,
				identity,
				cursor
			);
			// Storage may compare without case, so only exact matches are rejected.
			pending.push(
				...page.entities.filter(
					request =>
						request.organization === identity &&
						request.status === OrganizationRequestStatus.Pending
				)
			);
			cursor = page.cursor;
		} while (Is.stringValue(cursor));

		for (const request of pending) {
			try {
				// Only while still pending, so a request an admin answered meanwhile is kept.
				await storage.set(
					{
						...request,
						status: OrganizationRequestStatus.Rejected,
						reason: EntityStorageOrganizationService.REASON_ORGANIZATION_REMOVED,
						dateModified: new Date().toISOString()
					},
					[{ property: "status", value: OrganizationRequestStatus.Pending }]
				);
			} catch (error) {
				if (!BaseError.someErrorName(error, ConflictError.CLASS_NAME)) {
					throw error;
				}
			}
		}
	}

	/**
	 * Keep the revocation index an organization reached before it is removed, read again so an index
	 * given meanwhile is counted, so registering its DID again carries on from it.
	 * @param organization The organization.
	 * @returns A promise that resolves when the index is kept.
	 * @internal
	 */
	private async retireRevocationIndex(organization: Organization): Promise<void> {
		const current = await this._organizationEntityStorage.get(organization.id);
		await OrganizationHelper.retireRevocationIndex(
			this._accountDataEntityStorage,
			organization.identity,
			(Is.object<Organization>(current) ? current : organization).nextRevocationIndex
		);
	}

	/**
	 * Ensure an existing DID may be registered as an organization, it must not be held by an
	 * account, and a caller must prove they own it.
	 * @param identity The DID.
	 * @param callerAccountId The account of the caller, undefined for a system call.
	 * @param proof The proof by the DID over the organization proof document.
	 * @returns A promise that resolves when the DID may be registered.
	 * @throws ConflictError when the DID is held by an account.
	 * @throws UnauthorizedError when a required proof does not verify.
	 * @internal
	 */
	private async guardExistingIdentity(
		identity: string,
		callerAccountId: string | undefined,
		proof?: IProof
	): Promise<void> {
		if (
			Is.object(await this._accountDataEntityStorage.get(AccountDataHelper.identityId(identity)))
		) {
			throw new ConflictError(
				EntityStorageOrganizationService.CLASS_NAME,
				"organizationIdentityInUse",
				identity
			);
		}
		// System calls, such as from the node CLI, have no caller account and need no proof.
		if (!Is.stringValue(callerAccountId)) {
			return;
		}
		const identityComponent = this._identityComponent;
		if (Is.empty(identityComponent)) {
			throw new GeneralError(
				EntityStorageOrganizationService.CLASS_NAME,
				"identityComponentMissing"
			);
		}
		await IdentityProofHelper.verifyOrganization(
			identityComponent,
			identity,
			proof,
			this._identityProofMaxAgeSeconds
		);
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
				EntityStorageOrganizationService.CLASS_NAME,
				"identityComponentMissing"
			);
		}
		return this._identityComponent;
	}

	/**
	 * Get the DID of the node, the controller of the organization DIDs it creates and imports.
	 * @returns The DID.
	 * @internal
	 */
	private async nodeIdentity(): Promise<string> {
		const contextIds = await ContextIdStore.getContextIds();
		ContextIdHelper.guard(contextIds, ContextIdKeys.Node);
		return contextIds[ContextIdKeys.Node];
	}

	/**
	 * Register an organization for a DID.
	 * @param identity The DID.
	 * @param publicProfile The public profile, its name is stored for search.
	 * @param identityHeld True when the node created or imported the DID.
	 * @param nextRevocationIndex The revocation index the organization starts from.
	 * @returns The organization.
	 * @throws ConflictError when the DID is already registered.
	 * @internal
	 */
	private async register(
		identity: string,
		publicProfile: IOrganization["publicProfile"],
		identityHeld: boolean,
		nextRevocationIndex: number
	): Promise<Organization> {
		const lockKey = `organization-identity-${identity}`;
		await Mutex.lock(lockKey, { throwOnTimeout: true });
		try {
			// The search name is stored with the organization, so it is written once.
			const { organization: registered, created } = await OrganizationHelper.register(
				this._organizationEntityStorage,
				identity,
				OrganizationHelper.searchName(publicProfile),
				identityHeld,
				nextRevocationIndex
			);
			if (!created) {
				throw new ConflictError(
					EntityStorageOrganizationService.CLASS_NAME,
					"organizationExists",
					identity
				);
			}
			return registered;
		} finally {
			Mutex.unlock(lockKey);
		}
	}

	/**
	 * Import an organization identity controlled by the node, after checking it may be registered.
	 * The export is not put in an error, as it holds keys.
	 * @param exported The export.
	 * @param callerAccountId The account of the caller, undefined for a system call.
	 * @returns The DID and the controller it was imported with.
	 * @throws UnprocessableError when the export is not valid.
	 * @throws ConflictError when the DID is registered or held by an account or the node.
	 * @internal
	 */
	private async importIdentity(
		exported: IIdentityExport,
		callerAccountId: string | undefined
	): Promise<{ identity: string; controller: string }> {
		const identity: unknown = Is.object<IIdentityExport>(exported)
			? exported.document?.id
			: undefined;
		if (!Is.stringValue(identity) || !identity.startsWith("did:")) {
			throw new UnprocessableError(
				EntityStorageOrganizationService.CLASS_NAME,
				"identityExportInvalid"
			);
		}
		if (Is.stringValue(callerAccountId)) {
			await this._authenticationRateService?.check(
				EntityStorageOrganizationService.RATE_ACTION_IMPORT_IDENTITY,
				callerAccountId
			);
		}
		const identityComponent = this.requireIdentityComponent();
		const controller = await this.nodeIdentity();

		if (
			Is.object(await OrganizationHelper.findByIdentity(this._organizationEntityStorage, identity))
		) {
			throw new ConflictError(
				EntityStorageOrganizationService.CLASS_NAME,
				"organizationExists",
				identity
			);
		}
		const contextIds = await ContextIdStore.getContextIds();
		if (
			contextIds?.[ContextIdKeys.Node] === identity ||
			contextIds?.[ContextIdKeys.Organization] === identity ||
			Is.object(await this._accountDataEntityStorage.get(AccountDataHelper.identityId(identity)))
		) {
			throw new ConflictError(
				EntityStorageOrganizationService.CLASS_NAME,
				"organizationIdentityInUse",
				identity
			);
		}

		// The import proves the keys match the document before anything is stored.
		try {
			await identityComponent.identityImport(exported, controller);
		} catch (error) {
			// The node already holds the DID, which is a conflict rather than a failure.
			if (BaseError.someErrorName(error, ConflictError.CLASS_NAME)) {
				throw new ConflictError(
					EntityStorageOrganizationService.CLASS_NAME,
					"identityImportConflict",
					identity,
					undefined,
					undefined,
					error
				);
			}
			// The keys do not match the document, or the export is otherwise refused.
			throw new UnprocessableError(
				EntityStorageOrganizationService.CLASS_NAME,
				"identityExportInvalid",
				undefined,
				error
			);
		}
		return { identity, controller };
	}

	/**
	 * Undo creating an organization that failed, removing the membership of the first member, the
	 * registered organization with its profiles, and a DID the node created or imported for it. Each
	 * step is attempted on its own, a failure is logged and the error of the creation is the one
	 * reported.
	 * @param identity The DID of the organization.
	 * @param stored The organization when it was registered by this creation.
	 * @param held The controller of a DID the node created or imported, and whether it was imported.
	 * @param held.controller The controller of the DID.
	 * @param held.imported True when the DID was imported.
	 * @param firstMemberAccountId The account of the first member.
	 * @returns A promise that resolves when the creation has been undone.
	 * @internal
	 */
	private async rollbackCreate(
		identity: string,
		stored: Organization | undefined,
		held: { controller: string; imported: boolean } | undefined,
		firstMemberAccountId: string | undefined
	): Promise<void> {
		const steps: (() => Promise<unknown>)[] = [];
		// An organization registered before this creation, and its members, are left as they are.
		if (Is.object(stored)) {
			if (Is.stringValue(firstMemberAccountId)) {
				steps.push(async () =>
					MembershipRemovalHelper.leave(
						this._accountDataEntityStorage,
						this._identityComponent,
						firstMemberAccountId,
						identity
					)
				);
			}
			// The profiles of an existing DID may predate the organization, so they are kept.
			if (Is.object(held)) {
				steps.push(async () => this.removeProfiles(identity));
			}
			// The first member may have been given an index before creating failed.
			steps.push(async () => this.retireRevocationIndex(stored));
			steps.push(async () => this._organizationEntityStorage.remove(stored.id));
		}
		if (Is.object(held)) {
			// The document of an imported DID published on a ledger is kept, so the export can be
			// imported again.
			steps.push(async () =>
				this.requireIdentityComponent().identityRemove(
					identity,
					{ removeKeys: true, removeDocumentKey: true, retainDocument: held.imported },
					held.controller
				)
			);
		}
		for (const step of steps) {
			try {
				await step();
			} catch (error) {
				await this._logging?.log({
					level: "warn",
					source: EntityStorageOrganizationService.CLASS_NAME,
					ts: Date.now(),
					message: "organizationCreateRollbackFailed",
					error: BaseError.fromError(error),
					data: { identity }
				});
			}
		}
	}

	/**
	 * Remove the DID of an organization the node created or imported, a document published on a
	 * ledger is kept. A DID the node no longer holds is left.
	 * @param identity The DID.
	 * @returns A promise that resolves when the DID has been removed.
	 * @throws GeneralError when removing it fails.
	 * @internal
	 */
	private async removeHeldIdentity(identity: string): Promise<void> {
		const identityComponent = this.requireIdentityComponent();
		try {
			await identityComponent.identityRemove(
				identity,
				{ removeKeys: true, removeDocumentKey: true, retainDocument: true },
				await this.nodeIdentity()
			);
		} catch (error) {
			if (BaseError.someErrorName(error, NotFoundError.CLASS_NAME)) {
				return;
			}
			throw new GeneralError(
				EntityStorageOrganizationService.CLASS_NAME,
				"organizationIdentityRemoveFailed",
				{ identity },
				error
			);
		}
	}

	/**
	 * Remove the profiles of an organization.
	 * @param identity The DID of the organization.
	 * @returns A promise that resolves when the profiles have been removed.
	 * @internal
	 */
	private async removeProfiles(identity: string): Promise<void> {
		// An organization holds few items, its profiles, so they are collected before removing them.
		// The revocation index it reached is kept for when the DID is registered again.
		const retiredId = OrganizationHelper.retiredRevocationIndexId(identity);
		const ids: string[] = [];
		let cursor: string | undefined;
		do {
			const page = await AccountDataHelper.query(
				this._accountDataEntityStorage,
				identity,
				undefined,
				cursor
			);
			ids.push(...page.entities.map(item => item.id).filter(itemId => itemId !== retiredId));
			cursor = page.cursor;
		} while (Is.stringValue(cursor));
		for (const itemId of ids) {
			await this._accountDataEntityStorage.remove(itemId);
		}
	}

	/**
	 * Create a DID controlled by the node, with the verification method that signs membership
	 * credentials.
	 * @returns The DID.
	 * @internal
	 */
	private async createIdentity(): Promise<string> {
		const identityComponent = this.requireIdentityComponent();
		const nodeIdentity = await this.nodeIdentity();

		const document = await identityComponent.identityCreate(undefined, nodeIdentity);
		if (!Is.stringValue(document.id) || !document.id.startsWith("did:")) {
			throw new GeneralError(EntityStorageOrganizationService.CLASS_NAME, "identityCreateFailed");
		}

		try {
			await identityComponent.verificationMethodCreate(
				document.id,
				DidVerificationMethodType.AssertionMethod,
				this._verificationMethodId,
				nodeIdentity
			);
		} catch (error) {
			await identityComponent.identityRemove(
				document.id,
				{ removeKeys: true, removeDocumentKey: true },
				nodeIdentity
			);
			throw error;
		}
		return document.id;
	}

	/**
	 * Store the profiles of an organization as the default account data of its DID, replacing the existing ones.
	 * @param identity The DID of the organization, which owns its profiles.
	 * @param publicProfile The profile shown to others.
	 * @param privateProfile The profile only shown to the members and admins.
	 * @param isNew True when the DID was just created, so it has no profiles to replace.
	 * @returns A promise that resolves when the profiles have been stored.
	 * @internal
	 */
	private async storeProfiles(
		identity: string,
		publicProfile: IOrganization["publicProfile"],
		privateProfile: IOrganization["privateProfile"],
		isNew: boolean
	): Promise<void> {
		const profiles: [string, IOrganization["publicProfile"]][] = [
			[AuthenticationAccountDataType.PublicProfile, publicProfile],
			[AuthenticationAccountDataType.PrivateProfile, privateProfile]
		];
		// The profiles are of different types, so they are stored together.
		await Promise.all(
			profiles
				.filter(([, profile]) => Is.object(profile))
				.map(async ([type, data]) => {
					const existing = isNew
						? undefined
						: await AccountDataHelper.getDefault(this._accountDataEntityStorage, identity, type);
					if (Is.object(existing)) {
						await AccountDataHelper.updateItem(
							this._accountDataEntityStorage,
							existing,
							data,
							true
						);
					} else {
						await AccountDataHelper.create(
							this._accountDataEntityStorage,
							identity,
							type,
							data,
							true,
							undefined,
							{ hasNoItems: isNew }
						);
					}
				})
		);
	}

	/**
	 * Find the public profile of each of a list of organizations with a single query, the default
	 * profile of each, otherwise the earliest.
	 * @param identities The DIDs of the organizations.
	 * @returns The public profiles by DID.
	 * @internal
	 */
	private async findPublicProfiles(
		identities: string[]
	): Promise<Map<string, IOrganization["publicProfile"]>> {
		const profiles = new Map<string, AccountData>();
		if (identities.length === 0) {
			return new Map();
		}
		const wanted = new Set(identities);
		let cursor: string | undefined;
		do {
			const page = await this._accountDataEntityStorage.query(
				{
					conditions: [
						{ property: "accountId", value: identities, comparison: ComparisonOperator.In },
						{
							property: "type",
							value: AuthenticationAccountDataType.PublicProfile,
							comparison: ComparisonOperator.Equals
						}
					],
					logicalOperator: LogicalOperator.And
				},
				[{ property: "dateCreated", sortDirection: SortDirection.Ascending }],
				undefined,
				cursor
			);
			// Storage may compare without case or accents, so only exact matches are used.
			for (const item of page.entities as AccountData[]) {
				const current = profiles.get(item.accountId);
				if (
					wanted.has(item.accountId) &&
					item.type === AuthenticationAccountDataType.PublicProfile &&
					(!Is.object(current) || (item.isDefault && !current.isDefault))
				) {
					profiles.set(item.accountId, item);
				}
			}
			cursor = page.cursor;
		} while (Is.stringValue(cursor));

		return new Map(
			[...profiles].map(([identity, item]) => [
				identity,
				item.data as IOrganization["publicProfile"]
			])
		);
	}

	/**
	 * Check whether the caller may read the private profile of an organization, its members and
	 * admins may.
	 * @param identity The DID of the organization.
	 * @returns True when the caller may.
	 * @internal
	 */
	private async canReadPrivate(identity: string): Promise<boolean> {
		const contextIds = await ContextIdStore.getContextIds();
		const callerAccountId = contextIds?.[ContextIdKeys.Account];
		// The organization the account processor set is one the account is a member of.
		if (contextIds?.[ContextIdKeys.UserOrganization] === identity) {
			return true;
		}
		// Membership is a single indexed read, so it is checked before looking up the roles.
		if (
			Is.stringValue(callerAccountId) &&
			(await AdminScopeHelper.isMember(this._accountDataEntityStorage, callerAccountId, identity))
		) {
			return true;
		}
		return this.callerIsAdmin();
	}

	/**
	 * Check whether any account is a member of an organization, through the indexed organization
	 * column of the organization items, reading a single item.
	 * @param identity The DID of the organization.
	 * @returns True when an account is a member.
	 * @internal
	 */
	private async hasMembers(identity: string): Promise<boolean> {
		return AccountDataHelper.hasOrganizationItem(this._accountDataEntityStorage, identity);
	}

	/**
	 * Get a registered organization.
	 * @param id The unique identifier or the DID of the organization.
	 * @returns The organization.
	 * @throws NotFoundError when the organization is not registered.
	 * @internal
	 */
	private async getOrganization(id: string): Promise<Organization> {
		const organization = await OrganizationHelper.find(this._organizationEntityStorage, id);
		if (!Is.object(organization)) {
			throw new NotFoundError(
				EntityStorageOrganizationService.CLASS_NAME,
				"organizationNotFound",
				id
			);
		}
		return organization;
	}

	/**
	 * Get the organization to return from the one stored, without the search name.
	 * @param organization The organization as stored.
	 * @returns The organization.
	 * @internal
	 */
	private toOrganization(organization: Organization): IOrganization {
		return {
			id: organization.id,
			identity: organization.identity,
			dateCreated: organization.dateCreated,
			dateModified: organization.dateModified
		};
	}

	/**
	 * Check whether the caller holds escalated privilege or the member admin role, calls with no
	 * caller account, such as from the node CLI, are system calls.
	 * @returns True when the caller is an admin.
	 * @internal
	 */
	private async callerIsAdmin(): Promise<boolean> {
		return AdminScopeHelper.callerIsAdmin(
			this._authorizationComponent,
			this._authorizationModelId,
			this._escalatedPrivilegeRole,
			this._memberAdminRole
		);
	}

	/**
	 * Ensure the caller is an admin.
	 * @returns A promise that resolves when the caller is an admin.
	 * @throws ForbiddenError when it is not.
	 * @internal
	 */
	private async guardAdmin(): Promise<void> {
		if (!(await this.callerIsAdmin())) {
			throw new ForbiddenError(
				EntityStorageOrganizationService.CLASS_NAME,
				"organizationAdminRequired",
				{ escalatedRole: this._escalatedPrivilegeRole, adminRole: this._memberAdminRole }
			);
		}
	}
}
