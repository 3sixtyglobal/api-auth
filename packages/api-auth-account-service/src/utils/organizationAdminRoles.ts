// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuthorizationComponent } from "@3sixty/authorization-models";
import { ContextIdKeys, ContextIdStore } from "@3sixty/context";
import { Guards, Is } from "@3sixty/core";
import { nameof } from "@3sixty/nameof";

/**
 * The org admin roles of the organizations, a role per organization, its prefix followed by the DID
 * of the organization, held by account ids. Making an account an org admin also gives it the member
 * admin role, for the accounts of the organization, and taking its last org admin role takes that
 * role too. The services check the caller before changing a role, so the roles are changed as a
 * system call.
 */
export class OrganizationAdminRoles {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<OrganizationAdminRoles>();

	/**
	 * The default prefix of the org admin roles.
	 */
	public static readonly DEFAULT_ROLE_PREFIX: string = "org-admin:";

	/**
	 * The default role given with an org admin role.
	 */
	public static readonly DEFAULT_MEMBER_ADMIN_ROLE: string = "user-admin";

	/**
	 * The authorization component that holds the roles.
	 * @internal
	 */
	private readonly _authorizationComponent: IAuthorizationComponent;

	/**
	 * The authorization model ID the roles are held in.
	 * @internal
	 */
	private readonly _authorizationModelId: string;

	/**
	 * The prefix of the roles.
	 * @internal
	 */
	private readonly _rolePrefix: string;

	/**
	 * The role given with an org admin role.
	 * @internal
	 */
	private readonly _memberAdminRole: string;

	/**
	 * Create a new instance of OrganizationAdminRoles.
	 * @param authorizationComponent The authorization component that holds the roles.
	 * @param authorizationModelId The authorization model ID the roles are held in.
	 * @param rolePrefix The prefix of the roles, the default when omitted.
	 * @param memberAdminRole The role given with an org admin role, the default when omitted.
	 */
	constructor(
		authorizationComponent: IAuthorizationComponent,
		authorizationModelId: string,
		rolePrefix?: string,
		memberAdminRole?: string
	) {
		Guards.object<IAuthorizationComponent>(
			OrganizationAdminRoles.CLASS_NAME,
			nameof(authorizationComponent),
			authorizationComponent
		);
		Guards.stringValue(
			OrganizationAdminRoles.CLASS_NAME,
			nameof(authorizationModelId),
			authorizationModelId
		);
		this._authorizationComponent = authorizationComponent;
		this._authorizationModelId = authorizationModelId;
		this._rolePrefix = rolePrefix ?? OrganizationAdminRoles.DEFAULT_ROLE_PREFIX;
		Guards.stringValue(OrganizationAdminRoles.CLASS_NAME, nameof(rolePrefix), this._rolePrefix);
		this._memberAdminRole = memberAdminRole ?? OrganizationAdminRoles.DEFAULT_MEMBER_ADMIN_ROLE;
		Guards.stringValue(
			OrganizationAdminRoles.CLASS_NAME,
			nameof(memberAdminRole),
			this._memberAdminRole
		);
	}

	/**
	 * Get the org admin role of an organization.
	 * @param organization The DID of the organization.
	 * @returns The role.
	 */
	public role(organization: string): string {
		Guards.stringValue(OrganizationAdminRoles.CLASS_NAME, nameof(organization), organization);
		return `${this._rolePrefix}${organization}`;
	}

	/**
	 * Check whether a role is an org admin role.
	 * @param role The role.
	 * @returns True when it is.
	 */
	public isRole(role: string): boolean {
		return role.startsWith(this._rolePrefix);
	}

	/**
	 * Check whether an account is an org admin of an organization.
	 * @param accountId The account id, false when omitted.
	 * @param organization The DID of the organization.
	 * @returns True when it is.
	 */
	public async isAdmin(accountId: string | undefined, organization: string): Promise<boolean> {
		if (!Is.stringValue(accountId)) {
			return false;
		}
		return this._authorizationComponent.hasRoleForSubject(
			this._authorizationModelId,
			accountId,
			this.role(organization)
		);
	}

	/**
	 * Get the organizations an account is an org admin of.
	 * @param accountId The account id.
	 * @returns The DIDs of the organizations.
	 */
	public async organizations(accountId: string): Promise<string[]> {
		Guards.stringValue(OrganizationAdminRoles.CLASS_NAME, nameof(accountId), accountId);
		const roles = await this._authorizationComponent.getRolesForSubject(
			this._authorizationModelId,
			accountId
		);
		return roles
			.filter(role => role.startsWith(this._rolePrefix) && role.length > this._rolePrefix.length)
			.map(role => role.slice(this._rolePrefix.length));
	}

	/**
	 * Get the org admins of an organization.
	 * @param organization The DID of the organization.
	 * @returns The account ids.
	 */
	public async admins(organization: string): Promise<string[]> {
		return this._authorizationComponent.getSubjectsForRole(
			this._authorizationModelId,
			this.role(organization)
		);
	}

	/**
	 * Make an account an org admin of an organization, giving it the member admin role as well.
	 * @param accountId The account id.
	 * @param organization The DID of the organization.
	 * @returns A promise that resolves when the roles have been given.
	 */
	public async add(accountId: string, organization: string): Promise<void> {
		Guards.stringValue(OrganizationAdminRoles.CLASS_NAME, nameof(accountId), accountId);
		const role = this.role(organization);
		const hasMemberAdminRole = await this._authorizationComponent.hasRoleForSubject(
			this._authorizationModelId,
			accountId,
			this._memberAdminRole
		);
		await this.runAsSystem(async () => {
			await this._authorizationComponent.addRoleForSubject(
				this._authorizationModelId,
				accountId,
				role
			);
			if (!hasMemberAdminRole) {
				await this._authorizationComponent.addRoleForSubject(
					this._authorizationModelId,
					accountId,
					this._memberAdminRole
				);
			}
		});
	}

	/**
	 * Stop an account being an org admin of an organization, when it is one, taking the member admin
	 * role as well when it is an org admin of no other organization.
	 * @param accountId The account id.
	 * @param organization The DID of the organization.
	 * @returns A promise that resolves when the roles have been removed.
	 */
	public async remove(accountId: string, organization: string): Promise<void> {
		if (await this.isAdmin(accountId, organization)) {
			const role = this.role(organization);
			await this.runAsSystem(async () =>
				this._authorizationComponent.removeRoleForSubject(
					this._authorizationModelId,
					accountId,
					role
				)
			);
			await this.removeMemberAdminRole(accountId);
		}
	}

	/**
	 * Remove the org admin role of an organization from every account that holds it.
	 * @param organization The DID of the organization.
	 * @returns A promise that resolves when the roles have been removed.
	 */
	public async removeAll(organization: string): Promise<void> {
		const role = this.role(organization);
		const admins = await this.admins(organization);
		await this.runAsSystem(async () => {
			for (const accountId of admins) {
				await this._authorizationComponent.removeRoleForSubject(
					this._authorizationModelId,
					accountId,
					role
				);
			}
		});
		for (const accountId of admins) {
			await this.removeMemberAdminRole(accountId);
		}
	}

	/**
	 * Take the member admin role from an account that is an org admin of no organization, as it was
	 * given with its org admin roles.
	 * @param accountId The account id.
	 * @returns A promise that resolves when the role has been removed, or kept.
	 * @internal
	 */
	private async removeMemberAdminRole(accountId: string): Promise<void> {
		if ((await this.organizations(accountId)).length > 0) {
			return;
		}
		if (
			await this._authorizationComponent.hasRoleForSubject(
				this._authorizationModelId,
				accountId,
				this._memberAdminRole
			)
		) {
			await this.runAsSystem(async () =>
				this._authorizationComponent.removeRoleForSubject(
					this._authorizationModelId,
					accountId,
					this._memberAdminRole
				)
			);
		}
	}

	/**
	 * Run a method without the account, user and organization of the caller, which has been checked.
	 * @param method The method.
	 * @returns A promise that resolves when the method has run.
	 * @internal
	 */
	private async runAsSystem(method: () => Promise<void>): Promise<void> {
		const contextIds = await ContextIdStore.getContextIds();
		await ContextIdStore.run(
			{
				...contextIds,
				[ContextIdKeys.Account]: undefined,
				[ContextIdKeys.User]: undefined,
				[ContextIdKeys.UserOrganization]: undefined
			},
			method
		);
	}
}
