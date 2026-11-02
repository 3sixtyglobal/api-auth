// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuthorizationComponent } from "@3sixty/authorization-models";
import { ContextIdKeys, ContextIdStore } from "@3sixty/context";
import { Is } from "@3sixty/core";
import { ComparisonOperator, LogicalOperator } from "@3sixty/entity";
import type { IEntityStorageConnector } from "@3sixty/entity-storage-models";
import { nameof } from "@3sixty/nameof";
import { AccountDataHelper } from "./accountDataHelper.js";
import type { OrganizationAdminRoles } from "./organizationAdminRoles.js";
import type { AccountData } from "../entities/accountData.js";

/**
 * Helper class for the roles of the caller of the admin services. Callers holding escalated
 * privilege act across the whole tenant, other admins only on the members of the organizations they
 * are an org admin of, and accounts holding escalated privilege are protected from callers without it.
 */
export class AdminScopeHelper {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<AdminScopeHelper>();

	/**
	 * Get the account of the caller.
	 * @returns The account id, or undefined for a system call such as from the node CLI.
	 */
	public static async callerAccount(): Promise<string | undefined> {
		const contextIds = await ContextIdStore.getContextIds();
		const callerAccountId = contextIds?.[ContextIdKeys.Account];
		return Is.stringValue(callerAccountId) ? callerAccountId : undefined;
	}

	/**
	 * Check whether the caller holds escalated privilege, calls with no caller account are system
	 * calls and hold it. Roles are held by account ids, so a DID grants no privilege.
	 * @param authorizationComponent The authorization component.
	 * @param authorizationModelId The authorization model ID used to look up roles.
	 * @param escalatedPrivilegeRole The role that grants escalated privilege.
	 * @returns True when the caller holds escalated privilege.
	 */
	public static async callerIsEscalated(
		authorizationComponent: IAuthorizationComponent,
		authorizationModelId: string,
		escalatedPrivilegeRole: string
	): Promise<boolean> {
		const callerAccountId = await AdminScopeHelper.callerAccount();
		return (
			!Is.stringValue(callerAccountId) ||
			(await AdminScopeHelper.hasRole(
				authorizationComponent,
				authorizationModelId,
				callerAccountId,
				escalatedPrivilegeRole
			))
		);
	}

	/**
	 * Get a check of whether the caller holds escalated privilege that looks the role up at most once,
	 * for use within a single call so a role change is seen by the next call.
	 * @param authorizationComponent The authorization component.
	 * @param authorizationModelId The authorization model ID used to look up roles.
	 * @param escalatedPrivilegeRole The role that grants escalated privilege.
	 * @returns The check.
	 */
	public static callerIsEscalatedOnce(
		authorizationComponent: IAuthorizationComponent,
		authorizationModelId: string,
		escalatedPrivilegeRole: string
	): () => Promise<boolean> {
		let result: Promise<boolean> | undefined;
		return async () => {
			result ??= AdminScopeHelper.callerIsEscalated(
				authorizationComponent,
				authorizationModelId,
				escalatedPrivilegeRole
			);
			return result;
		};
	}

	/**
	 * Check whether the caller holds escalated privilege or the admin role.
	 * @param authorizationComponent The authorization component.
	 * @param authorizationModelId The authorization model ID used to look up roles.
	 * @param escalatedPrivilegeRole The role that grants escalated privilege.
	 * @param adminRole The admin role.
	 * @returns True when the caller is an admin.
	 */
	public static async callerIsAdmin(
		authorizationComponent: IAuthorizationComponent,
		authorizationModelId: string,
		escalatedPrivilegeRole: string,
		adminRole: string
	): Promise<boolean> {
		if (
			await AdminScopeHelper.callerIsEscalated(
				authorizationComponent,
				authorizationModelId,
				escalatedPrivilegeRole
			)
		) {
			return true;
		}
		return AdminScopeHelper.hasRole(
			authorizationComponent,
			authorizationModelId,
			(await AdminScopeHelper.callerAccount()) ?? "",
			adminRole
		);
	}

	/**
	 * Check whether the caller may change an account, an account holding escalated privilege may
	 * only be changed by a caller holding it.
	 * @param authorizationComponent The authorization component.
	 * @param authorizationModelId The authorization model ID used to look up roles.
	 * @param escalatedPrivilegeRole The role that grants escalated privilege.
	 * @param accountId The account being changed.
	 * @param callerIsEscalated The check of the caller, from callerIsEscalatedOnce, so a call that
	 * also needs it looks the role up once, a new lookup when omitted.
	 * @returns True when the caller may change the account.
	 */
	public static async callerMayChange(
		authorizationComponent: IAuthorizationComponent,
		authorizationModelId: string,
		escalatedPrivilegeRole: string,
		accountId: string,
		callerIsEscalated?: () => Promise<boolean>
	): Promise<boolean> {
		const targetIsEscalated = await AdminScopeHelper.hasRole(
			authorizationComponent,
			authorizationModelId,
			accountId,
			escalatedPrivilegeRole
		);
		if (!targetIsEscalated) {
			return true;
		}
		return Is.function(callerIsEscalated)
			? callerIsEscalated()
			: AdminScopeHelper.callerIsEscalated(
					authorizationComponent,
					authorizationModelId,
					escalatedPrivilegeRole
				);
	}

	/**
	 * Get the organizations the caller manages.
	 * @param adminRoles The org admin roles.
	 * @param callerIsEscalated The check of whether the caller holds escalated privilege.
	 * @returns The DIDs of the organizations the caller is an org admin of, or undefined when the
	 * caller holds escalated privilege and manages every organization.
	 */
	public static async managedOrganizations(
		adminRoles: OrganizationAdminRoles,
		callerIsEscalated: () => Promise<boolean>
	): Promise<string[] | undefined> {
		if (await callerIsEscalated()) {
			return undefined;
		}
		const callerAccountId = await AdminScopeHelper.callerAccount();
		return Is.stringValue(callerAccountId) ? adminRoles.organizations(callerAccountId) : [];
	}

	/**
	 * Get the accounts the caller manages, the members of the organizations it is an org admin of.
	 * @param storage The entity storage for account data.
	 * @param adminRoles The org admin roles.
	 * @param callerIsEscalated The check of whether the caller holds escalated privilege.
	 * @returns The account ids, or undefined when the caller holds escalated privilege and manages
	 * every account.
	 */
	public static async managedAccounts(
		storage: IEntityStorageConnector<AccountData>,
		adminRoles: OrganizationAdminRoles,
		callerIsEscalated: () => Promise<boolean>
	): Promise<string[] | undefined> {
		const organizations = await AdminScopeHelper.managedOrganizations(
			adminRoles,
			callerIsEscalated
		);
		if (!Is.array(organizations)) {
			return undefined;
		}
		const accountIds = new Set<string>();
		if (organizations.length > 0) {
			let cursor: string | undefined;
			do {
				const page = await storage.query(
					{
						property: "organization",
						value: organizations,
						comparison: ComparisonOperator.In
					},
					undefined,
					["accountId"],
					cursor
				);
				for (const item of page.entities) {
					if (Is.stringValue(item.accountId)) {
						accountIds.add(item.accountId);
					}
				}
				cursor = page.cursor;
			} while (Is.stringValue(cursor));
		}
		return [...accountIds];
	}

	/**
	 * Check whether the caller manages an account, a caller holding escalated privilege manages every
	 * account, others the members of the organizations they are an org admin of.
	 * @param storage The entity storage for account data.
	 * @param adminRoles The org admin roles.
	 * @param callerIsEscalated The check of whether the caller holds escalated privilege.
	 * @param accountId The account.
	 * @returns True when the caller manages the account.
	 */
	public static async callerManages(
		storage: IEntityStorageConnector<AccountData>,
		adminRoles: OrganizationAdminRoles,
		callerIsEscalated: () => Promise<boolean>,
		accountId: string
	): Promise<boolean> {
		const organizations = await AdminScopeHelper.managedOrganizations(
			adminRoles,
			callerIsEscalated
		);
		if (!Is.array(organizations)) {
			return true;
		}
		if (organizations.length === 0) {
			return false;
		}
		const result = await storage.query(
			{
				conditions: [
					{ property: "accountId", value: accountId, comparison: ComparisonOperator.Equals },
					{ property: "organization", value: organizations, comparison: ComparisonOperator.In }
				],
				logicalOperator: LogicalOperator.And
			},
			undefined,
			["id"],
			undefined,
			1
		);
		return result.entities.length > 0;
	}

	/**
	 * Check whether an account is in an organization.
	 * @param storage The entity storage for account data.
	 * @param accountId The account id.
	 * @param organization The DID of the organization.
	 * @returns True when the account has an organization item for the organization.
	 */
	public static async isMember(
		storage: IEntityStorageConnector<AccountData>,
		accountId: string,
		organization: string
	): Promise<boolean> {
		if (!Is.stringValue(organization)) {
			return false;
		}
		return AccountDataHelper.hasOrganizationItem(storage, organization, accountId);
	}

	/**
	 * Check whether an account holds a role.
	 * @param authorizationComponent The authorization component.
	 * @param authorizationModelId The authorization model ID used to look up roles.
	 * @param accountId The account id.
	 * @param role The role.
	 * @returns True when the account holds the role.
	 * @internal
	 */
	private static async hasRole(
		authorizationComponent: IAuthorizationComponent,
		authorizationModelId: string,
		accountId: string,
		role: string
	): Promise<boolean> {
		if (!Is.stringValue(accountId)) {
			return false;
		}
		return authorizationComponent.hasRoleForSubject(authorizationModelId, accountId, role);
	}
}
