// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type {
	IAuthenticationAccountAdminComponent,
	IOrganizationRequestAdminComponent
} from "@3sixty/api-auth-models";
import { EmailHelper } from "@3sixty/api-auth-models";
import type { IAuthorizationComponent } from "@3sixty/authorization-models";
import { ContextIdKeys, ContextIdStore } from "@3sixty/context";
import { BaseError, Is, NotFoundError } from "@3sixty/core";
import { ComparisonOperator, LogicalOperator } from "@3sixty/entity";
import type { IEntityStorageConnector } from "@3sixty/entity-storage-models";
import { nameof } from "@3sixty/nameof";
import { AuthTokenCache } from "./authTokenCache.js";
import { PasswordResetHelper } from "./passwordResetHelper.js";
import type { AuthenticationPasswordReset } from "../entities/authenticationPasswordReset.js";
import type { AuthenticationUser } from "../entities/authenticationUser.js";

/**
 * Helper class for finding and removing accounts.
 */
export class AccountHelper {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<AccountHelper>();

	/**
	 * Find the account a provider identifies.
	 * @param userEntityStorage The entity storage for users.
	 * @param authProviderId The authentication provider id.
	 * @param providerAccountId The account identifier issued by the provider.
	 * @returns The account, or undefined when there is none.
	 */
	public static async findByProviderAccount(
		userEntityStorage: IEntityStorageConnector<AuthenticationUser>,
		authProviderId: string,
		providerAccountId: string
	): Promise<AuthenticationUser | undefined> {
		return AccountHelper.findFirst(userEntityStorage, authProviderId, {
			property: "providerAccountId",
			value: providerAccountId
		});
	}

	/**
	 * Find the account a provider holds for an e-mail address. The normalised address is matched
	 * first, then the address as given, so accounts stored before addresses were normalised are found.
	 * @param userEntityStorage The entity storage for users.
	 * @param authProviderId The authentication provider id.
	 * @param email The e-mail address of the account.
	 * @returns The account, or undefined when there is none.
	 */
	public static async findByEmail(
		userEntityStorage: IEntityStorageConnector<AuthenticationUser>,
		authProviderId: string,
		email: string
	): Promise<AuthenticationUser | undefined> {
		const normalised = EmailHelper.normalise(email);
		const user = await AccountHelper.findFirst(userEntityStorage, authProviderId, {
			property: "email",
			value: normalised
		});
		const given = email.trim();
		if (Is.object<AuthenticationUser>(user) || given === normalised) {
			return user;
		}
		return AccountHelper.findFirst(userEntityStorage, authProviderId, {
			property: "email",
			value: given
		});
	}

	/**
	 * Check whether an account is disabled, accounts stored before the flag existed use the date.
	 * @param user The account.
	 * @returns True when the account is disabled.
	 */
	public static isDisabled(user: AuthenticationUser): boolean {
		return Is.stringValue(user.dateDisabled);
	}

	/**
	 * Check whether an account may sign in, it must be enabled and verified, accounts without the
	 * verified flag are verified.
	 * @param user The account.
	 * @returns True when the account may sign in.
	 */
	public static canSignIn(user: AuthenticationUser): boolean {
		return !AccountHelper.isDisabled(user) && user.verified !== false;
	}

	/**
	 * Find the accounts of any provider for an e-mail address.
	 * @param userEntityStorage The entity storage for users.
	 * @param email The e-mail address of the accounts.
	 * @param limit The maximum number of accounts to return.
	 * @returns The accounts.
	 */
	public static async findAllByEmail(
		userEntityStorage: IEntityStorageConnector<AuthenticationUser>,
		email: string,
		limit: number
	): Promise<AuthenticationUser[]> {
		const result = await userEntityStorage.query(
			{
				property: "email",
				value: EmailHelper.normalise(email),
				comparison: ComparisonOperator.Equals
			},
			undefined,
			undefined,
			undefined,
			limit
		);
		if (result.entities.length > 0 || email.trim() === EmailHelper.normalise(email)) {
			return result.entities as AuthenticationUser[];
		}
		const legacy = await userEntityStorage.query(
			{ property: "email", value: email.trim(), comparison: ComparisonOperator.Equals },
			undefined,
			undefined,
			undefined,
			limit
		);
		return legacy.entities as AuthenticationUser[];
	}

	/**
	 * Write a change to an account. The last write wins until the storage locks writes optimistically.
	 * @param userEntityStorage The entity storage for users.
	 * @param user The account as read.
	 * @param change Make the change to an account, or return undefined when there is nothing to change.
	 * @returns The account as written, or undefined when there was nothing to change.
	 */
	public static async update(
		userEntityStorage: IEntityStorageConnector<AuthenticationUser>,
		user: AuthenticationUser,
		change: (
			current: AuthenticationUser
		) => Promise<AuthenticationUser | undefined> | AuthenticationUser | undefined
	): Promise<AuthenticationUser | undefined> {
		const updated = await change(user);
		if (Is.undefined(updated)) {
			return undefined;
		}
		await userEntityStorage.set(updated);
		return updated;
	}

	/**
	 * Disable an account and move its password version on, so its tokens stop working, and clear its
	 * tokens from the token caches of this process. An account already disabled is left as it is.
	 * @param userEntityStorage The entity storage for users.
	 * @param user The account as read.
	 * @returns The account as written, or undefined when it was already disabled.
	 */
	public static async disable(
		userEntityStorage: IEntityStorageConnector<AuthenticationUser>,
		user: AuthenticationUser
	): Promise<AuthenticationUser | undefined> {
		try {
			return await AccountHelper.update(userEntityStorage, user, current => {
				if (AccountHelper.isDisabled(current)) {
					return;
				}
				const now = new Date().toISOString();
				return {
					...current,
					dateDisabled: now,
					passwordVersion: (current.passwordVersion ?? 0) + 1,
					dateModified: now
				};
			});
		} finally {
			// Cleared even when already disabled, in case a cached token outlived an earlier change.
			AuthTokenCache.invalidate(user.accountId);
		}
	}

	/**
	 * Remove an account and the data stored for it: its password reset and verification tokens, its
	 * requests to join an organization, its account data and its roles, when the storage and
	 * components that hold them exist. The account is disabled first, so its sessions end and a
	 * concurrent sign in cannot write it again, and it is removed last. The caller must already have
	 * been checked, the data is removed as the system.
	 * @param userEntityStorage The entity storage for users.
	 * @param passwordResetEntityStorage The entity storage for password reset tokens.
	 * @param accountAdmin The account data admin component.
	 * @param organizationRequestAdmin The organization request admin component.
	 * @param accountId The account id.
	 * @param authorization The authorization component and model that hold the roles of the account.
	 * @param authorization.component The authorization component.
	 * @param authorization.modelId The authorization model ID the roles are held in.
	 * @returns A promise that resolves when the account has been removed.
	 */
	public static async removeAccount(
		userEntityStorage: IEntityStorageConnector<AuthenticationUser>,
		passwordResetEntityStorage: IEntityStorageConnector<AuthenticationPasswordReset> | undefined,
		accountAdmin: IAuthenticationAccountAdminComponent | undefined,
		organizationRequestAdmin: IOrganizationRequestAdminComponent | undefined,
		accountId: string,
		authorization?: { component?: IAuthorizationComponent; modelId: string }
	): Promise<void> {
		const user = await userEntityStorage.get(accountId);
		if (Is.object<AuthenticationUser>(user) && user.accountId === accountId) {
			await AccountHelper.disable(userEntityStorage, user);
		} else {
			AuthTokenCache.invalidate(accountId);
		}

		if (Is.object(passwordResetEntityStorage)) {
			await PasswordResetHelper.removeForAccount(passwordResetEntityStorage, accountId, "all");
		}

		// Removing the organization of the account first would otherwise stop the caller removing the
		// rest of its data.
		await AccountHelper.runAsSystem(async () => {
			await organizationRequestAdmin?.removeForAccount(accountId);

			if (Is.object(accountAdmin)) {
				let page = await accountAdmin.query(accountId);
				// Each page is read from the start again, as the items already read have been removed.
				while (page.entities.length > 0) {
					for (const item of page.entities) {
						try {
							await accountAdmin.remove(item.id);
						} catch (error) {
							// Removing an identity also removes its credentials and organizations, so a later
							// item of the page may already be gone.
							if (!BaseError.someErrorName(error, NotFoundError.CLASS_NAME)) {
								throw error;
							}
						}
					}
					page = await accountAdmin.query(accountId);
				}
			}
		});

		// Account ids are not reused, but the roles would otherwise be left behind for good.
		await authorization?.component?.removeAllRolesForSubject(authorization.modelId, accountId);

		await userEntityStorage.remove(accountId);
	}

	/**
	 * Run a method as the system, without the caller's account, once the caller has been checked.
	 * @param method The method to run.
	 * @returns The result of the method.
	 */
	public static async runAsSystem<T>(method: () => Promise<T>): Promise<T> {
		const contextIds = await ContextIdStore.getContextIds();
		return ContextIdStore.run(
			{
				...contextIds,
				[ContextIdKeys.Account]: undefined,
				[ContextIdKeys.User]: undefined,
				[ContextIdKeys.UserOrganization]: undefined
			},
			method
		);
	}

	/**
	 * Find the first account of a provider with a matching property.
	 * @param userEntityStorage The entity storage for users.
	 * @param authProviderId The authentication provider id.
	 * @param match The property and value to match.
	 * @param match.property The property to match.
	 * @param match.value The value to match.
	 * @returns The account, or undefined when there is none.
	 * @internal
	 */
	private static async findFirst(
		userEntityStorage: IEntityStorageConnector<AuthenticationUser>,
		authProviderId: string,
		match: { property: string; value: string }
	): Promise<AuthenticationUser | undefined> {
		const result = await userEntityStorage.query(
			{
				conditions: [
					{
						property: "authProviderId",
						value: authProviderId,
						comparison: ComparisonOperator.Equals
					},
					{ property: match.property, value: match.value, comparison: ComparisonOperator.Equals }
				],
				logicalOperator: LogicalOperator.And
			},
			undefined,
			undefined,
			undefined,
			1
		);
		return result.entities[0] as AuthenticationUser | undefined;
	}
}
