// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import {
	type IOrganizationRequest,
	type IOrganizationRequestAdminComponent,
	type IOrganizationRequestCount,
	OrganizationRequestStatus
} from "@3sixty/api-auth-models";
import { ForbiddenError } from "@3sixty/api-models";
import type { IAuthorizationComponent } from "@3sixty/authorization-models";
import {
	ComponentFactory,
	ConflictError,
	Guards,
	Is,
	NotFoundError,
	UnprocessableError
} from "@3sixty/core";
import { ComparisonOperator } from "@3sixty/entity";
import {
	EntityStorageConnectorFactory,
	type IEntityStorageConnector
} from "@3sixty/entity-storage-models";
import type { IIdentityComponent } from "@3sixty/identity-models";
import { nameof } from "@3sixty/nameof";
import type { AccountData } from "../entities/accountData.js";
import type { Organization } from "../entities/organization.js";
import type { OrganizationRequest } from "../entities/organizationRequest.js";
import type { IEntityStorageOrganizationRequestAdminServiceConstructorOptions } from "../models/IEntityStorageOrganizationRequestAdminServiceConstructorOptions.js";
import { AdminScopeHelper } from "../utils/adminScopeHelper.js";
import { OrganizationAdminRoles } from "../utils/organizationAdminRoles.js";
import { OrganizationHelper } from "../utils/organizationHelper.js";
import { OrganizationMembershipHelper } from "../utils/organizationMembershipHelper.js";
import { OrganizationRequestHelper } from "../utils/organizationRequestHelper.js";

/**
 * Reviews the requests of accounts to join the organizations of the tenant using entity storage.
 * Callers holding escalated privilege review the requests of every organization, other callers only
 * those of the organizations they are an org admin of, other requests are reported as missing.
 */
export class EntityStorageOrganizationRequestAdminService implements IOrganizationRequestAdminComponent {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string =
		nameof<EntityStorageOrganizationRequestAdminService>();

	/**
	 * The default verification method of the organization that signs the membership credential.
	 */
	public static readonly DEFAULT_VERIFICATION_METHOD_ID: string = "trust-assertion";

	/**
	 * The default role that grants escalated privilege.
	 */
	public static readonly DEFAULT_ESCALATED_PRIVILEGE_ROLE: string = "global-admin";

	/**
	 * The default authorization model ID used to look up roles.
	 */
	public static readonly DEFAULT_AUTHORIZATION_MODEL_ID: string = "system";

	/**
	 * The format of an i18n key, dot separated segments such as organizationRequest.reason.notAMember.
	 * @internal
	 */
	private static readonly _I18N_KEY_REGEX: RegExp = /^[A-Za-z][\w-]*(\.[A-Za-z][\w-]*)+$/;

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
	 * The entity storage for the registered organizations.
	 * @internal
	 */
	private readonly _organizationEntityStorage: IEntityStorageConnector<Organization>;

	/**
	 * The identity component that issues the membership credentials.
	 * @internal
	 */
	private readonly _identityComponent: IIdentityComponent;

	/**
	 * The verification method of the organization that signs the membership credential.
	 * @internal
	 */
	private readonly _verificationMethodId: string;

	/**
	 * The authorization component used to find callers with escalated privilege.
	 * @internal
	 */
	private readonly _authorizationComponent: IAuthorizationComponent;

	/**
	 * The role that grants escalated privilege, accounts holding it are only changed by callers holding it.
	 * @internal
	 */
	private readonly _escalatedPrivilegeRole: string;

	/**
	 * The authorization model ID used to look up roles.
	 * @internal
	 */
	private readonly _authorizationModelId: string;

	/**
	 * The org admin roles of the organizations, which decide the requests a caller reviews.
	 * @internal
	 */
	private readonly _adminRoles: OrganizationAdminRoles;

	/**
	 * Create a new instance of EntityStorageOrganizationRequestAdminService.
	 * @param options The options for the service.
	 */
	constructor(options?: IEntityStorageOrganizationRequestAdminServiceConstructorOptions) {
		this._accountDataEntityStorage = EntityStorageConnectorFactory.get(
			options?.accountDataEntityStorageType ?? "account-data"
		);
		this._organizationRequestEntityStorage = EntityStorageConnectorFactory.get(
			options?.organizationRequestEntityStorageType ?? "organization-request"
		);
		this._organizationEntityStorage = EntityStorageConnectorFactory.get(
			options?.organizationEntityStorageType ?? "organization"
		);
		this._identityComponent = ComponentFactory.get<IIdentityComponent>(
			options?.identityComponentType ?? "identity-service"
		);
		this._verificationMethodId =
			options?.config?.verificationMethodId ??
			EntityStorageOrganizationRequestAdminService.DEFAULT_VERIFICATION_METHOD_ID;
		this._authorizationComponent = ComponentFactory.get<IAuthorizationComponent>(
			options?.authorizationComponentType ?? "authorization"
		);
		this._escalatedPrivilegeRole =
			options?.config?.escalatedPrivilegeRole ??
			EntityStorageOrganizationRequestAdminService.DEFAULT_ESCALATED_PRIVILEGE_ROLE;
		this._authorizationModelId =
			options?.config?.authorizationModelId ??
			EntityStorageOrganizationRequestAdminService.DEFAULT_AUTHORIZATION_MODEL_ID;
		this._adminRoles = new OrganizationAdminRoles(
			this._authorizationComponent,
			this._authorizationModelId,
			options?.config?.organizationAdminRolePrefix
		);
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return EntityStorageOrganizationRequestAdminService.CLASS_NAME;
	}

	/**
	 * Get a request.
	 * @param id The unique identifier of the request.
	 * @returns The request.
	 * @throws NotFoundError when the request does not exist, or is for an organization the caller
	 * does not manage.
	 */
	public async get(id: string): Promise<IOrganizationRequest> {
		const request = await OrganizationRequestHelper.get(this._organizationRequestEntityStorage, id);
		const managed = await AdminScopeHelper.managedOrganizations(
			this._adminRoles,
			AdminScopeHelper.callerIsEscalatedOnce(
				this._authorizationComponent,
				this._authorizationModelId,
				this._escalatedPrivilegeRole
			)
		);
		if (Is.array(managed) && !managed.includes(request.organization)) {
			throw new NotFoundError(
				OrganizationRequestHelper.CLASS_NAME,
				"organizationRequestNotFound",
				id
			);
		}
		return request;
	}

	/**
	 * Query the requests of the organizations the caller manages, the earliest first.
	 * @param status The status of the requests to return, all when omitted.
	 * @param organization The organization of the requests to return, all the caller manages when omitted.
	 * @param cursor The cursor to request the next page.
	 * @param limit The maximum number of requests to return.
	 * @returns The requests and a cursor when there are more.
	 */
	public async query(
		status?: OrganizationRequestStatus,
		organization?: string,
		cursor?: string,
		limit?: number
	): Promise<{
		entities: IOrganizationRequest[];
		cursor?: string;
	}> {
		const organizations = await this.scopeOrganizations(organization);
		if (Is.array(organizations) && organizations.length === 0) {
			return { entities: [] };
		}
		return OrganizationRequestHelper.query(
			this._organizationRequestEntityStorage,
			status,
			organizations,
			cursor,
			limit
		);
	}

	/**
	 * Count the requests of a status of the organizations the caller manages, up to a cap so counting
	 * stays bounded on every storage.
	 * @param status The status of the requests to count.
	 * @param organization The organization of the requests to count, all the caller manages when omitted.
	 * @returns The number of requests, and whether there are more than the cap.
	 * @throws GuardError when the status is not a request status.
	 */
	public async countRequests(
		status: OrganizationRequestStatus,
		organization?: string
	): Promise<IOrganizationRequestCount> {
		Guards.arrayOneOf<OrganizationRequestStatus>(
			EntityStorageOrganizationRequestAdminService.CLASS_NAME,
			nameof(status),
			status,
			Object.values(OrganizationRequestStatus)
		);
		const organizations = await this.scopeOrganizations(organization);
		if (Is.array(organizations) && organizations.length === 0) {
			return { count: 0, capped: false };
		}
		return OrganizationRequestHelper.count(
			this._organizationRequestEntityStorage,
			status,
			organizations
		);
	}

	/**
	 * Accept a pending request, issuing a membership credential from the organization and storing
	 * the organization and the credential as the account data of the account.
	 * @param id The unique identifier of the request.
	 * @returns A promise that resolves when the account has joined the organization.
	 * @throws NotFoundError when the request does not exist, or is for an organization the caller
	 * does not manage.
	 * @throws ConflictError when the request is not pending.
	 * @throws UnprocessableError when the account no longer has an identity.
	 * @throws ForbiddenError when the account holds escalated privilege and the caller does not, or
	 * is the caller's own account and the caller does not hold escalated privilege.
	 * @throws NotFoundError when the organization is not registered.
	 */
	public async accept(id: string): Promise<void> {
		const request = await this.getPending(id);
		// The role of the caller is looked up at most once for the call.
		const callerIsEscalated = AdminScopeHelper.callerIsEscalatedOnce(
			this._authorizationComponent,
			this._authorizationModelId,
			this._escalatedPrivilegeRole
		);
		await this.guardEscalatedTarget(request.accountId, callerIsEscalated);
		// As with the account admin, an admin may not choose the organization of their own account.
		if (
			(await AdminScopeHelper.callerAccount()) === request.accountId &&
			!(await callerIsEscalated())
		) {
			throw new ForbiddenError(
				EntityStorageOrganizationRequestAdminService.CLASS_NAME,
				"ownAccountNotPermitted",
				{ roleName: this._escalatedPrivilegeRole }
			);
		}
		await OrganizationHelper.guardRegistered(this._organizationEntityStorage, request.organization);

		await OrganizationMembershipHelper.join(
			this._accountDataEntityStorage,
			this._organizationEntityStorage,
			this._identityComponent,
			this._verificationMethodId,
			request.accountId,
			request.organization,
			undefined,
			undefined
		);

		await this._organizationRequestEntityStorage.set({
			...request,
			status: OrganizationRequestStatus.Accepted,
			dateModified: new Date().toISOString()
		});
	}

	/**
	 * Reject a pending request.
	 * @param id The unique identifier of the request.
	 * @param reason The i18n key of the reason to give the account, for the client to translate.
	 * @returns A promise that resolves when the request has been rejected.
	 * @throws NotFoundError when the request does not exist, or is for an organization the caller
	 * does not manage.
	 * @throws ConflictError when the request is not pending.
	 * @throws UnprocessableError when the reason is not an i18n key.
	 */
	public async reject(id: string, reason?: string): Promise<void> {
		if (
			!Is.undefined(reason) &&
			!EntityStorageOrganizationRequestAdminService._I18N_KEY_REGEX.test(reason)
		) {
			throw new UnprocessableError(
				EntityStorageOrganizationRequestAdminService.CLASS_NAME,
				"reasonNotI18nKey",
				{ reason }
			);
		}

		const request = await this.getPending(id);

		await this._organizationRequestEntityStorage.set({
			...request,
			status: OrganizationRequestStatus.Rejected,
			reason,
			dateModified: new Date().toISOString()
		});
	}

	/**
	 * Remove every request of an account, used when the account is removed.
	 * @param accountId The account id.
	 * @returns A promise that resolves when the requests have been removed.
	 * @throws ForbiddenError when the account holds escalated privilege and the caller does not.
	 */
	public async removeForAccount(accountId: string): Promise<void> {
		Guards.stringValue(
			EntityStorageOrganizationRequestAdminService.CLASS_NAME,
			nameof(accountId),
			accountId
		);

		await this.guardEscalatedTarget(accountId);

		const condition = {
			property: "accountId",
			value: accountId,
			comparison: ComparisonOperator.Equals
		};
		// The requests are collected before removing them, as removing changes the pages a cursor
		// would return.
		const ids: string[] = [];
		let cursor: string | undefined;
		do {
			const page = await this._organizationRequestEntityStorage.query(
				condition,
				undefined,
				["id"],
				cursor
			);
			ids.push(...page.entities.map(request => request.id as string));
			cursor = page.cursor;
		} while (Is.stringValue(cursor));
		if (ids.length > 0) {
			await this._organizationRequestEntityStorage.removeBatch(ids);
		}
	}

	/**
	 * Get a request that is still pending.
	 * @param id The unique identifier of the request.
	 * @returns The request.
	 * @throws NotFoundError when the request does not exist.
	 * @throws ConflictError when the request is not pending.
	 * @internal
	 */
	private async getPending(id: string): Promise<IOrganizationRequest> {
		const request = await this.get(id);
		if (request.status !== OrganizationRequestStatus.Pending) {
			throw new ConflictError(
				EntityStorageOrganizationRequestAdminService.CLASS_NAME,
				"organizationRequestClosed",
				id
			);
		}
		return request;
	}

	/**
	 * Get the organizations to read the requests of, those the caller manages.
	 * @param organization The organization asked for, all the caller manages when omitted.
	 * @returns The organization or organizations, none when the caller manages none of them, or
	 * undefined for every organization.
	 * @internal
	 */
	private async scopeOrganizations(
		organization: string | undefined
	): Promise<string | string[] | undefined> {
		const managed = await AdminScopeHelper.managedOrganizations(
			this._adminRoles,
			AdminScopeHelper.callerIsEscalatedOnce(
				this._authorizationComponent,
				this._authorizationModelId,
				this._escalatedPrivilegeRole
			)
		);
		if (!Is.array(managed)) {
			return organization;
		}
		return Is.stringValue(organization)
			? managed.filter(managedOrganization => managedOrganization === organization)
			: managed;
	}

	/**
	 * Ensure the caller may change an account, an account holding escalated privilege may only be
	 * changed by a caller holding it.
	 * @param accountId The account id.
	 * @param callerIsEscalated The check of whether the caller holds escalated privilege, a new
	 * lookup when omitted.
	 * @returns A promise that resolves when the caller may change the account.
	 * @throws ForbiddenError when it may not.
	 * @internal
	 */
	private async guardEscalatedTarget(
		accountId: string,
		callerIsEscalated?: () => Promise<boolean>
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
				EntityStorageOrganizationRequestAdminService.CLASS_NAME,
				"insufficientRoleForEscalatedTarget",
				{ roleName: this._escalatedPrivilegeRole }
			);
		}
	}
}
