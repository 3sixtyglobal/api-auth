// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuthorizationComponent } from "@3sixty/authorization-models";
import { ContextIdKeys, ContextIdStore } from "@3sixty/context";
import { Is } from "@3sixty/core";
import type { IEntityStorageConnector } from "@3sixty/entity-storage-models";
import { nameof } from "@3sixty/nameof";
import { AccountDataHelper } from "./accountDataHelper.js";
import type { AccountData } from "../entities/accountData.js";

/**
 * Helper class for the roles of the caller of the admin services. Admins act across the whole
 * tenant, only accounts holding escalated privilege are protected from callers without it.
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
	 * @param authorizationComponent The authorization component, no caller account holds it without one.
	 * @param authorizationModelId The authorization model ID used to look up roles.
	 * @param escalatedPrivilegeRole The role that grants escalated privilege.
	 * @returns True when the caller holds escalated privilege.
	 */
	public static async callerIsEscalated(
		authorizationComponent: IAuthorizationComponent | undefined,
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
	 * @param authorizationComponent The authorization component, no caller account holds it without one.
	 * @param authorizationModelId The authorization model ID used to look up roles.
	 * @param escalatedPrivilegeRole The role that grants escalated privilege.
	 * @returns The check.
	 */
	public static callerIsEscalatedOnce(
		authorizationComponent: IAuthorizationComponent | undefined,
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
		authorizationComponent: IAuthorizationComponent | undefined,
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
	 * @param authorizationComponent The authorization component, every account may be changed without one.
	 * @param authorizationModelId The authorization model ID used to look up roles.
	 * @param escalatedPrivilegeRole The role that grants escalated privilege.
	 * @param accountId The account being changed.
	 * @param callerIsEscalated The check of the caller, from callerIsEscalatedOnce, so a call that
	 * also needs it looks the role up once, a new lookup when omitted.
	 * @returns True when the caller may change the account.
	 */
	public static async callerMayChange(
		authorizationComponent: IAuthorizationComponent | undefined,
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
		authorizationComponent: IAuthorizationComponent | undefined,
		authorizationModelId: string,
		accountId: string,
		role: string
	): Promise<boolean> {
		if (!Is.object(authorizationComponent) || !Is.stringValue(accountId)) {
			return false;
		}
		return authorizationComponent.hasRoleForSubject(authorizationModelId, accountId, role);
	}
}
