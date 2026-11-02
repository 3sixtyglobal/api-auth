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
	type IOrganizationMember,
	type IOrganizationProfileUpdate,
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
import type { IProof } from "@3sixty/standards-w3c-did";
import { EntityStorageAuthenticationAccountService } from "./entityStorageAuthenticationAccountService.js";
import type { AccountData } from "../entities/accountData.js";
import type { Organization } from "../entities/organization.js";
import type { OrganizationRequest } from "../entities/organizationRequest.js";
import type { IEntityStorageOrganizationServiceConstructorOptions } from "../models/IEntityStorageOrganizationServiceConstructorOptions.js";
import { AccountDataHelper } from "../utils/accountDataHelper.js";
import { AdminScopeHelper } from "../utils/adminScopeHelper.js";
import { IdentityProofHelper } from "../utils/identityProofHelper.js";
import { MembershipRemovalHelper } from "../utils/membershipRemovalHelper.js";
import { OrganizationAdminRoles } from "../utils/organizationAdminRoles.js";
import { OrganizationHelper } from "../utils/organizationHelper.js";
import { OrganizationProfileHelper } from "../utils/organizationProfileHelper.js";
import { OrganizationRequestHelper } from "../utils/organizationRequestHelper.js";
import { PendingMembershipHelper } from "../utils/pendingMembershipHelper.js";

/**
 * Manages the organizations registered on the node using entity storage, their profiles, logos and
 * public data are held as account data owned by the organization DID. Callers holding escalated
 * privilege manage every organization of the tenant, the org admins of an organization manage it,
 * and callers holding the member admin role also create, list, export and remove the organizations
 * they are an org admin of.
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
	 * The entity storage for the requests to join an organization.
	 * @internal
	 */
	private readonly _organizationRequestEntityStorage: IEntityStorageConnector<OrganizationRequest>;

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
	 * The identity component.
	 * @internal
	 */
	private readonly _identityComponent: IIdentityComponent;

	/**
	 * How long an organization identity proof may be used for after it was created, in seconds.
	 * @internal
	 */
	private readonly _identityProofMaxAgeSeconds: number;

	/**
	 * The authorization component.
	 * @internal
	 */
	private readonly _authorizationComponent: IAuthorizationComponent;

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
	 * The rate component.
	 * @internal
	 */
	private readonly _authenticationRateService: IAuthenticationRateComponent;

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
	 * The org admin roles of the organizations.
	 * @internal
	 */
	private readonly _adminRoles: OrganizationAdminRoles;

	/**
	 * Create a new instance of EntityStorageOrganizationService.
	 * @param options The options for the service.
	 */
	constructor(options?: IEntityStorageOrganizationServiceConstructorOptions) {
		this._organizationEntityStorage = EntityStorageConnectorFactory.get(
			options?.organizationEntityStorageType ?? "organization"
		);
		this._organizationRequestEntityStorage = EntityStorageConnectorFactory.get<
			IEntityStorageConnector<OrganizationRequest>
		>(options?.organizationRequestEntityStorageType ?? "organization-request");
		this._logging = ComponentFactory.getIfExists<ILoggingComponent>(
			options?.loggingComponentType ?? "logging"
		);
		this._accountDataEntityStorage = EntityStorageConnectorFactory.get(
			options?.accountDataEntityStorageType ?? "account-data"
		);
		this._identityComponent = ComponentFactory.get<IIdentityComponent>(
			options?.identityComponentType ?? "identity-service"
		);
		this._identityProofMaxAgeSeconds =
			options?.config?.identityProofMaxAgeSeconds ?? IdentityProofHelper.DEFAULT_MAX_AGE_SECONDS;
		this._authorizationComponent = ComponentFactory.get<IAuthorizationComponent>(
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
		this._authenticationRateService = ComponentFactory.get<IAuthenticationRateComponent>(
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
		this._adminRoles = new OrganizationAdminRoles(
			this._authorizationComponent,
			this._authorizationModelId,
			options?.config?.organizationAdminRolePrefix,
			this._memberAdminRole
		);
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
			await this._authenticationRateService.registerAction(action, limit);
		}
	}

	/**
	 * The component needs to be stopped when the node is closed.
	 * @param nodeLoggingComponentType The node logging component type.
	 * @returns A promise that resolves when the rate limit actions have been unregistered.
	 */
	public async stop(nodeLoggingComponentType?: string): Promise<void> {
		for (const action of Object.keys(this._rateLimits)) {
			await this._authenticationRateService.unregisterAction(action);
		}
	}

	/**
	 * Create an organization, only admins may. A node controlled DID with the trust verification
	 * method is created when no DID is given, an existing DID needs a proof by it unless the call is
	 * a system call. The signed in caller is the first member and its org admin, the organization
	 * becomes its default when it has none. A system call, such as from the node CLI, has no account so the
	 * organization is created without members, firstMemberAccountId is ignored. An identity export
	 * may be given instead, it is imported controlled by the node and removed again when the
	 * organization can not be registered.
	 * @param organization The details of the organization.
	 * @returns The organization.
	 * @throws ForbiddenError when the caller is not an admin.
	 * @throws ConflictError when the DID is already registered or held by an account or the node.
	 * @throws UnauthorizedError when a required proof does not verify.
	 * @throws UnprocessableError when an identity export is given with an identity or proof, or is
	 * not valid, or the profile, logo or public data is not valid.
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
		const changes = {
			profile: organization.profile,
			logo: organization.logo,
			publicData: organization.publicData
		};
		OrganizationProfileHelper.validate(changes);
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
			const nodeIdentity = await this.nodeIdentity();
			identity = await OrganizationHelper.createNodeIdentity(
				this._identityComponent,
				nodeIdentity,
				this._verificationMethodId
			);
			held = { controller: nodeIdentity, imported: false };
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
				changes.profile,
				Is.object(held),
				Math.max(retiredRevocationIndex ?? 0, importedRevocationIndex ?? 0)
			);
			// A created DID has no profile yet, an existing or imported one may.
			await OrganizationProfileHelper.store(
				this._accountDataEntityStorage,
				identity,
				changes,
				!Is.stringValue(existingIdentity) && !Is.object(identityImport)
			);

			// The first member is the caller, who is made its org admin, so a caller without escalated
			// privilege keeps managing what it creates.
			if (Is.stringValue(firstMemberAccountId)) {
				await PendingMembershipHelper.add(
					this._accountDataEntityStorage,
					this._organizationEntityStorage,
					this._identityComponent,
					this._verificationMethodId,
					firstMemberAccountId,
					identity,
					undefined
				);
				await this._adminRoles.add(firstMemberAccountId, identity);
			}
		} catch (error) {
			await this.rollbackCreate(identity, stored, held, firstMemberAccountId);
			throw error;
		}

		return {
			...this.toOrganization(stored),
			...(await OrganizationProfileHelper.load(this._accountDataEntityStorage, identity)),
			isAdmin: Is.stringValue(firstMemberAccountId)
		};
	}

	/**
	 * Get an organization, its members, org admins and admins get the profile, logo and public data
	 * paths, others the public data.
	 * @param id The unique identifier or the DID of the organization.
	 * @returns The organization.
	 * @throws NotFoundError when the organization is not registered.
	 */
	public async get(id: string): Promise<IOrganization> {
		const organization = await this.getOrganization(id);

		const [isAdmin, canReadFull] = await Promise.all([
			this._adminRoles.isAdmin(await AdminScopeHelper.callerAccount(), organization.identity),
			this.canReadFull(organization.identity)
		]);
		if (isAdmin || canReadFull) {
			return {
				...this.toOrganization(organization),
				...(await OrganizationProfileHelper.load(
					this._accountDataEntityStorage,
					organization.identity
				)),
				isAdmin
			};
		}
		return {
			...this.toOrganization(organization),
			public: await AccountDataHelper.buildPublicData(
				this._accountDataEntityStorage,
				organization.identity,
				organization.identity
			),
			isAdmin
		};
	}

	/**
	 * Query the organizations, the earliest first, only admins may, an admin without escalated
	 * privilege gets the organizations it is an org admin of.
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
		const managed = await AdminScopeHelper.managedOrganizations(
			this._adminRoles,
			AdminScopeHelper.callerIsEscalatedOnce(
				this._authorizationComponent,
				this._authorizationModelId,
				this._escalatedPrivilegeRole
			)
		);
		if (Is.array(managed) && managed.length === 0) {
			return { entities: [] };
		}
		const result = await this._organizationEntityStorage.query(
			Is.array(managed)
				? { property: "identity", value: managed, comparison: ComparisonOperator.In }
				: undefined,
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
	 * @returns The organizations with their public data, which always includes their names.
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
		// The name was searched, so it is always included with the public data.
		return {
			entities: await Promise.all(
				matches.map(async organization => ({
					...this.toOrganization(organization),
					public: await AccountDataHelper.buildPublicData(
						this._accountDataEntityStorage,
						organization.identity,
						organization.identity,
						[`${AuthenticationAccountDataType.Profile}.name`]
					)
				}))
			)
		};
	}

	/**
	 * Change the profile, logo and public data of an organization, those omitted are unchanged, its
	 * org admins and callers holding escalated privilege may.
	 * @param id The unique identifier or the DID of the organization.
	 * @param changes The profile, logo and public data.
	 * @returns A promise that resolves when the organization has been changed.
	 * @throws NotFoundError when the organization is not registered.
	 * @throws ForbiddenError when the caller does not manage the organization.
	 * @throws UnprocessableError when the profile, logo or public data is not valid.
	 */
	public async update(id: string, changes: IOrganizationProfileUpdate): Promise<void> {
		Guards.object<IOrganizationProfileUpdate>(
			EntityStorageOrganizationService.CLASS_NAME,
			nameof(changes),
			changes
		);
		OrganizationProfileHelper.validate(changes);
		const organization = await this.getOrganization(id);
		await this.guardManager(organization.identity);

		await OrganizationProfileHelper.store(
			this._accountDataEntityStorage,
			organization.identity,
			changes,
			false
		);
		const profile = changes.profile;
		if (Is.object(profile)) {
			// Read again before writing, so a revocation index allocated meanwhile is kept.
			await OrganizationHelper.updateOrganization(
				this._organizationEntityStorage,
				organization.identity,
				current => ({ ...current, searchName: OrganizationHelper.searchName(profile) })
			);
		}
	}

	/**
	 * Query the members of an organization, its members, org admins and callers holding escalated
	 * privilege may.
	 * @param id The unique identifier or the DID of the organization.
	 * @param cursor The cursor to request the next page.
	 * @param limit The maximum number of members to return.
	 * @returns The members and a cursor when there are more.
	 * @throws NotFoundError when the organization is not registered.
	 * @throws ForbiddenError when the caller is not a member and does not manage the organization.
	 */
	public async queryMembers(
		id: string,
		cursor?: string,
		limit?: number
	): Promise<{
		entities: IOrganizationMember[];
		cursor?: string;
	}> {
		const organization = await this.getOrganization(id);
		const callerAccountId = await AdminScopeHelper.callerAccount();
		if (!(
			Is.stringValue(callerAccountId) &&
			(await AdminScopeHelper.isMember(
				this._accountDataEntityStorage,
				callerAccountId,
				organization.identity
			))
		)) {
			await this.guardManager(organization.identity);
		}

		const page = await this._accountDataEntityStorage.query(
			{
				property: "organization",
				value: organization.identity,
				comparison: ComparisonOperator.Equals
			},
			[{ property: "dateCreated", sortDirection: SortDirection.Ascending }],
			["accountId"],
			cursor,
			limit
		);
		const accountIds = [
			...new Set(
				page.entities.map(item => item.accountId).filter(accountId => Is.stringValue(accountId))
			)
		];
		const [admins, profiles] = await Promise.all([
			this._adminRoles.admins(organization.identity),
			this.loadMemberProfiles(accountIds)
		]);
		return {
			entities: accountIds.map(accountId => ({
				accountId,
				...profiles.get(accountId),
				isAdmin: admins.includes(accountId)
			})),
			cursor: page.cursor
		};
	}

	/**
	 * Make a member an org admin of an organization, its org admins and callers holding escalated
	 * privilege may.
	 * @param id The unique identifier or the DID of the organization.
	 * @param accountId The account of the member.
	 * @returns A promise that resolves when the member is an org admin.
	 * @throws NotFoundError when the organization is not registered or the account is not a member.
	 * @throws ForbiddenError when the caller does not manage the organization.
	 */
	public async addAdmin(id: string, accountId: string): Promise<void> {
		Guards.stringValue(EntityStorageOrganizationService.CLASS_NAME, nameof(accountId), accountId);
		const organization = await this.getOrganization(id);
		await this.guardManager(organization.identity);
		if (
			!(await AdminScopeHelper.isMember(
				this._accountDataEntityStorage,
				accountId,
				organization.identity
			))
		) {
			throw new NotFoundError(
				EntityStorageOrganizationService.CLASS_NAME,
				"organizationMemberNotFound",
				accountId
			);
		}
		await this._adminRoles.add(accountId, organization.identity);
	}

	/**
	 * Stop a member being an org admin of an organization, its org admins and callers holding
	 * escalated privilege may, only callers holding escalated privilege may remove the last org admin.
	 * @param id The unique identifier or the DID of the organization.
	 * @param accountId The account of the member.
	 * @returns A promise that resolves when the member is no longer an org admin.
	 * @throws NotFoundError when the organization is not registered or the account is neither a
	 * member nor an org admin.
	 * @throws ForbiddenError when the caller does not manage the organization.
	 * @throws ConflictError when the account is the last org admin and the caller does not hold
	 * escalated privilege.
	 */
	public async removeAdmin(id: string, accountId: string): Promise<void> {
		Guards.stringValue(EntityStorageOrganizationService.CLASS_NAME, nameof(accountId), accountId);
		const organization = await this.getOrganization(id);
		const callerIsEscalated = AdminScopeHelper.callerIsEscalatedOnce(
			this._authorizationComponent,
			this._authorizationModelId,
			this._escalatedPrivilegeRole
		);
		await this.guardManager(organization.identity, callerIsEscalated);

		const admins = await this._adminRoles.admins(organization.identity);
		if (!admins.includes(accountId)) {
			if (
				!(await AdminScopeHelper.isMember(
					this._accountDataEntityStorage,
					accountId,
					organization.identity
				))
			) {
				throw new NotFoundError(
					EntityStorageOrganizationService.CLASS_NAME,
					"organizationMemberNotFound",
					accountId
				);
			}
			return;
		}
		if (admins.length === 1 && !(await callerIsEscalated())) {
			throw new ConflictError(
				EntityStorageOrganizationService.CLASS_NAME,
				"organizationLastAdmin",
				accountId
			);
		}
		await this._adminRoles.remove(accountId, organization.identity);
	}

	/**
	 * Export the identity of an organization with its private keys, only admins may, and only for an
	 * organization whose keys the node holds, such as one it created or imported. The DID of the node
	 * and of the organization of the tenant are never exported.
	 * @param id The unique identifier or the DID of the organization.
	 * @param sessionStart When the session of the caller started in seconds, it must be recent.
	 * @returns The export with the revocation index the organization reached, which contains private
	 * keys and must be protected.
	 * @throws ForbiddenError when the caller is not an admin of the organization, or the organization
	 * is the node or the organization of the tenant.
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
		const organization = await this.getOrganization(id);
		await this.guardManager(organization.identity);
		const callerAccountId = await AdminScopeHelper.callerAccount();
		// A system call, such as from the node CLI, has no session.
		if (Is.stringValue(callerAccountId)) {
			RecentSignInHelper.guard(sessionStart, this._recentSignInSeconds);
			await this._authenticationRateService.check(
				EntityStorageOrganizationService.RATE_ACTION_EXPORT_IDENTITY,
				callerAccountId
			);
		}
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
		let identity: IIdentityExport;
		try {
			identity = await this._identityComponent.identityExport(
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
	 * Remove an organization with its account data and org admin roles. Callers holding escalated
	 * privilege and its org admins may remove it when no account is a member, and the pending
	 * requests to join it are rejected, with the reason organizationRequest.reason.organizationRemoved.
	 * An org admin who is its only member may also remove it, which ends their membership, revoking
	 * its credential, and removes the pending requests to join it. The keys of a DID the node created
	 * or imported for the organization are removed with it, a DID registered as an existing identity
	 * is left, as the node does not hold it.
	 * @param id The unique identifier or the DID of the organization.
	 * @returns A promise that resolves when the organization has been removed.
	 * @throws NotFoundError when the organization is not registered.
	 * @throws ForbiddenError when the caller does not manage the organization.
	 * @throws ConflictError when another account is a member of the organization.
	 * @throws GeneralError when removing the keys of the organization fails, the organization is kept.
	 */
	public async remove(id: string): Promise<void> {
		const organization = await this.getOrganization(id);
		const callerAccountId = await AdminScopeHelper.callerAccount();
		const callerIsEscalated = AdminScopeHelper.callerIsEscalatedOnce(
			this._authorizationComponent,
			this._authorizationModelId,
			this._escalatedPrivilegeRole
		);
		const isAdmin = await this._adminRoles.isAdmin(callerAccountId, organization.identity);
		if (!isAdmin) {
			await this.guardManager(organization.identity, callerIsEscalated);
		}

		// Two members are read, enough to tell whether the caller is the only one.
		const members = await this._accountDataEntityStorage.query(
			{
				property: "organization",
				value: organization.identity,
				comparison: ComparisonOperator.Equals
			},
			undefined,
			["accountId"],
			undefined,
			2
		);
		const memberIds = members.entities.map(item => item.accountId);
		if (memberIds.length === 0) {
			await this.removeOrganization(organization, false);
			return;
		}
		if (
			isAdmin &&
			Is.stringValue(callerAccountId) &&
			memberIds.length === 1 &&
			memberIds[0] === callerAccountId
		) {
			// The membership ends first, as its credential is revoked with the keys of the organization.
			await MembershipRemovalHelper.leave(
				this._accountDataEntityStorage,
				this._identityComponent,
				this._adminRoles,
				callerAccountId,
				organization.identity
			);
			await this.removeOrganization(organization, true);
			return;
		}
		throw new ConflictError(
			EntityStorageOrganizationService.CLASS_NAME,
			isAdmin && !(await callerIsEscalated())
				? "organizationHasOtherMembers"
				: "organizationHasMembers",
			organization.identity
		);
	}

	/**
	 * Remove an organization that has no members, with its account data, org admin roles and the
	 * keys of a DID the node holds for it.
	 * @param organization The organization.
	 * @param removeRequests True to remove the pending requests to join it, otherwise they are
	 * rejected with a reason.
	 * @returns A promise that resolves when the organization has been removed.
	 * @internal
	 */
	private async removeOrganization(
		organization: Organization,
		removeRequests: boolean
	): Promise<void> {
		// The keys are removed first, so a failure leaves the organization to be removed again.
		if (organization.identityHeld === true) {
			await this.removeHeldIdentity(organization.identity);
		}
		await OrganizationProfileHelper.removeAll(
			this._accountDataEntityStorage,
			organization.identity
		);
		await this.closePendingRequests(organization.identity, removeRequests);
		await this._adminRoles.removeAll(organization.identity);
		await this.retireRevocationIndex(organization);
		await this._organizationEntityStorage.remove(organization.id);
	}

	/**
	 * Close the pending requests to join an organization that is removed, rejected so each account
	 * sees why it was not let in rather than waiting on a request no one can answer, or removed.
	 * @param identity The DID of the organization.
	 * @param remove True to remove the requests rather than reject them.
	 * @returns A promise that resolves when the requests have been closed.
	 * @internal
	 */
	private async closePendingRequests(identity: string, remove: boolean): Promise<void> {
		// Collected first, as rejecting a request takes it out of the pending pages being read.
		const pending: IOrganizationRequest[] = [];
		let cursor: string | undefined;
		do {
			const page = await OrganizationRequestHelper.query(
				this._organizationRequestEntityStorage,
				OrganizationRequestStatus.Pending,
				identity,
				cursor
			);
			pending.push(...page.entities);
			cursor = page.cursor;
		} while (Is.stringValue(cursor));

		for (const request of pending) {
			try {
				// Only while still pending, so a request an admin answered meanwhile is kept.
				const pendingCondition = [
					{ property: "status" as const, value: OrganizationRequestStatus.Pending }
				];
				if (remove) {
					await this._organizationRequestEntityStorage.remove(request.id, pendingCondition);
				} else {
					await this._organizationRequestEntityStorage.set(
						{
							...request,
							status: OrganizationRequestStatus.Rejected,
							reason: EntityStorageOrganizationService.REASON_ORGANIZATION_REMOVED,
							dateModified: new Date().toISOString()
						},
						pendingCondition
					);
				}
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
		await IdentityProofHelper.verifyOrganization(
			this._identityComponent,
			identity,
			proof,
			this._identityProofMaxAgeSeconds
		);
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
	 * @param profile The profile, its name is stored for search.
	 * @param identityHeld True when the node created or imported the DID.
	 * @param nextRevocationIndex The revocation index the organization starts from.
	 * @returns The organization.
	 * @throws ConflictError when the DID is already registered.
	 * @internal
	 */
	private async register(
		identity: string,
		profile: IOrganization["profile"],
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
				OrganizationHelper.searchName(profile),
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
			await this._authenticationRateService.check(
				EntityStorageOrganizationService.RATE_ACTION_IMPORT_IDENTITY,
				callerAccountId
			);
		}
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
			await this._identityComponent.identityImport(exported, controller);
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
						this._adminRoles,
						firstMemberAccountId,
						identity
					)
				);
			}
			// The profiles of an existing DID may predate the organization, so they are kept.
			if (Is.object(held)) {
				steps.push(async () =>
					OrganizationProfileHelper.removeAll(this._accountDataEntityStorage, identity)
				);
			}
			// The first member may have been given an index before creating failed.
			steps.push(async () => this.retireRevocationIndex(stored));
			steps.push(async () => this._organizationEntityStorage.remove(stored.id));
		}
		if (Is.object(held)) {
			// The document of an imported DID published on a ledger is kept, so the export can be
			// imported again.
			steps.push(async () =>
				this._identityComponent.identityRemove(
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
		try {
			await this._identityComponent.identityRemove(
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
	 * Read the e-mail address and name of a list of members from their profiles, with a single query.
	 * @param accountIds The accounts of the members.
	 * @returns The e-mail address and name by account id.
	 * @internal
	 */
	private async loadMemberProfiles(
		accountIds: string[]
	): Promise<Map<string, { email?: string; name?: string }>> {
		const members = new Map<string, { email?: string; name?: string }>();
		if (accountIds.length === 0) {
			return members;
		}
		const profiles = new Map<string, AccountData>();
		let cursor: string | undefined;
		do {
			const page = await this._accountDataEntityStorage.query(
				{
					conditions: [
						{ property: "accountId", value: accountIds, comparison: ComparisonOperator.In },
						{
							property: "type",
							value: AuthenticationAccountDataType.Profile,
							comparison: ComparisonOperator.Equals
						}
					],
					logicalOperator: LogicalOperator.And
				},
				[{ property: "dateCreated", sortDirection: SortDirection.Ascending }],
				undefined,
				cursor
			);
			for (const item of page.entities as AccountData[]) {
				const current = profiles.get(item.accountId);
				if (!Is.object(current) || (item.isDefault && !current.isDefault)) {
					profiles.set(item.accountId, item);
				}
			}
			cursor = page.cursor;
		} while (Is.stringValue(cursor));

		for (const [accountId, item] of profiles) {
			const profile = Is.object<{ [key: string]: unknown }>(item.data) ? item.data : {};
			const name = Is.stringValue(profile.name)
				? profile.name
				: [profile.givenName, profile.familyName].filter(part => Is.stringValue(part)).join(" ");
			members.set(accountId, {
				email: Is.stringValue(profile.email) ? profile.email : undefined,
				name: Is.stringValue(name) ? name : undefined
			});
		}
		return members;
	}

	/**
	 * Check whether the caller may read the profile, logo and public data of an organization, its
	 * members and admins may.
	 * @param identity The DID of the organization.
	 * @returns True when the caller may.
	 * @internal
	 */
	private async canReadFull(identity: string): Promise<boolean> {
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
		return AdminScopeHelper.callerIsAdmin(
			this._authorizationComponent,
			this._authorizationModelId,
			this._escalatedPrivilegeRole,
			this._memberAdminRole
		);
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
	 * Ensure the caller manages an organization, as its org admin or holding escalated privilege.
	 * @param identity The DID of the organization.
	 * @param callerIsEscalated The check of whether the caller holds escalated privilege, a new
	 * lookup when omitted.
	 * @returns A promise that resolves when the caller manages the organization.
	 * @throws ForbiddenError when it does not.
	 * @internal
	 */
	private async guardManager(
		identity: string,
		callerIsEscalated?: () => Promise<boolean>
	): Promise<void> {
		if (await this._adminRoles.isAdmin(await AdminScopeHelper.callerAccount(), identity)) {
			return;
		}
		const isEscalated = Is.function(callerIsEscalated)
			? await callerIsEscalated()
			: await AdminScopeHelper.callerIsEscalated(
					this._authorizationComponent,
					this._authorizationModelId,
					this._escalatedPrivilegeRole
				);
		if (!isEscalated) {
			throw new ForbiddenError(
				EntityStorageOrganizationService.CLASS_NAME,
				"organizationAdminRequired",
				{ escalatedRole: this._escalatedPrivilegeRole, adminRole: this._memberAdminRole }
			);
		}
	}

	/**
	 * Ensure the caller is an admin.
	 * @returns A promise that resolves when the caller is an admin.
	 * @throws ForbiddenError when it is not.
	 * @internal
	 */
	private async guardAdmin(): Promise<void> {
		if (
			!(await AdminScopeHelper.callerIsAdmin(
				this._authorizationComponent,
				this._authorizationModelId,
				this._escalatedPrivilegeRole,
				this._memberAdminRole
			))
		) {
			throw new ForbiddenError(
				EntityStorageOrganizationService.CLASS_NAME,
				"organizationAdminRequired",
				{ escalatedRole: this._escalatedPrivilegeRole, adminRole: this._memberAdminRole }
			);
		}
	}
}
