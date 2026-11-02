// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IPasswordHashOptions } from "@3sixty/api-auth-entity-storage-models";
import {
	AccountHelper,
	type AuthenticationUser,
	PasswordHelper
} from "@3sixty/api-auth-entity-storage-service";
import {
	EmailHelper,
	type IAuthenticationProvider,
	type IAuthenticationProviderCapabilities,
	type IAuthenticationProviderIdentity
} from "@3sixty/api-auth-models";
import { Guards, Is, UnauthorizedError } from "@3sixty/core";
import {
	EntityStorageConnectorFactory,
	type IEntityStorageConnector
} from "@3sixty/entity-storage-models";
import { nameof } from "@3sixty/nameof";
import type { IEntityStorageAuthenticationProviderConnectorConstructorOptions } from "./models/IEntityStorageAuthenticationProviderConnectorConstructorOptions.js";
import type { IPasswordCredentials } from "./models/IPasswordCredentials.js";

/**
 * Authentication provider that verifies passwords for accounts held in entity storage.
 */
export class EntityStorageAuthenticationProviderConnector implements IAuthenticationProvider<IPasswordCredentials> {
	/**
	 * The authentication provider id to register the connector with.
	 */
	public static readonly NAMESPACE: string = "entity-storage";

	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string =
		nameof<EntityStorageAuthenticationProviderConnector>();

	/**
	 * The entity storage for users.
	 * @internal
	 */
	private readonly _userEntityStorage: IEntityStorageConnector<AuthenticationUser>;

	/**
	 * The Argon2id parameters for new hashes.
	 * @internal
	 */
	private readonly _passwordHashOptions?: IPasswordHashOptions;

	/**
	 * Create a new instance of EntityStorageAuthenticationProviderConnector.
	 * @param options The options for the connector.
	 */
	constructor(options?: IEntityStorageAuthenticationProviderConnectorConstructorOptions) {
		this._userEntityStorage = EntityStorageConnectorFactory.get(
			options?.userEntityStorageType ?? "authentication-user"
		);
		this._passwordHashOptions = options?.config?.passwordHashOptions;
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return EntityStorageAuthenticationProviderConnector.CLASS_NAME;
	}

	/**
	 * Get what the provider supports, a password form with passwords and profiles changed on this node.
	 * @returns The provider capabilities.
	 */
	public getCapabilities(): IAuthenticationProviderCapabilities {
		return {
			signInMethod: "password",
			passwordChange: "api",
			profileReadOnly: false
		};
	}

	/**
	 * Verify the e-mail address and password of a password account. A legacy or outdated password
	 * hash is replaced with an Argon2id hash, and a legacy e-mail address normalised, once the
	 * password matches.
	 * @param credentials The e-mail address and password.
	 * @returns The verified identity.
	 * @throws UnauthorizedError when the account does not exist or the password does not match.
	 */
	public async authenticate(
		credentials: IPasswordCredentials
	): Promise<IAuthenticationProviderIdentity> {
		Guards.object<IPasswordCredentials>(
			EntityStorageAuthenticationProviderConnector.CLASS_NAME,
			nameof(credentials),
			credentials
		);
		Guards.stringValue(
			EntityStorageAuthenticationProviderConnector.CLASS_NAME,
			nameof(credentials.email),
			credentials.email
		);
		Guards.stringValue(
			EntityStorageAuthenticationProviderConnector.CLASS_NAME,
			nameof(credentials.password),
			credentials.password
		);

		const user = await AccountHelper.findByEmail(
			this._userEntityStorage,
			EntityStorageAuthenticationProviderConnector.NAMESPACE,
			credentials.email
		);
		if (
			!Is.object<AuthenticationUser>(user) ||
			!Is.stringValue(user.password) ||
			!Is.stringValue(user.salt) ||
			!Is.stringValue(user.providerAccountId)
		) {
			// A hash is still computed so an unknown account takes as long as a wrong password.
			// to stop timing attacks, where an failed password returns quickly.
			await PasswordHelper.dummyVerify(credentials.password, this._passwordHashOptions);
			throw new UnauthorizedError(
				EntityStorageAuthenticationProviderConnector.CLASS_NAME,
				"loginFailed"
			);
		}

		if (!Is.stringValue(user.passwordAlgorithm)) {
			// A legacy hash is quick to check, so the Argon2id work is still done and the time taken
			// does not reveal the account exists.
			await PasswordHelper.dummyVerify(credentials.password, this._passwordHashOptions);
		}
		if (!(await PasswordHelper.verifyPassword(user, credentials.password))) {
			throw new UnauthorizedError(
				EntityStorageAuthenticationProviderConnector.CLASS_NAME,
				"loginFailed"
			);
		}

		const updated = await this.upgradeAccount(user, credentials.password);

		return {
			providerAccountId: updated.providerAccountId ?? user.providerAccountId,
			accountId: user.accountId,
			email: updated.email
		};
	}

	/**
	 * Replace a legacy or outdated password hash and normalise a legacy e-mail address, once the
	 * password matched. The account is only written when it is unchanged since it was read, and never
	 * written again once removed, and the password version is kept, so existing sessions continue.
	 * @param user The account.
	 * @param password The password that matched.
	 * @returns The account as written, or as read when another change won the write.
	 * @internal
	 */
	private async upgradeAccount(
		user: AuthenticationUser,
		password: string
	): Promise<AuthenticationUser> {
		let updated: AuthenticationUser = user;

		if (PasswordHelper.needsRehash(user, this._passwordHashOptions)) {
			updated = {
				...updated,
				...(await PasswordHelper.hashPassword(password, this._passwordHashOptions))
			};
		}

		const normalisedEmail = EmailHelper.normalise(user.email);
		if (user.email !== normalisedEmail) {
			// The address is only normalised when no other password account already uses it.
			const other = await AccountHelper.findByEmail(
				this._userEntityStorage,
				EntityStorageAuthenticationProviderConnector.NAMESPACE,
				normalisedEmail
			);
			if (!Is.object<AuthenticationUser>(other) || other.accountId === user.accountId) {
				updated = {
					...updated,
					email: normalisedEmail,
					providerAccountId: normalisedEmail
				};
			}
		}

		if (updated === user) {
			return user;
		}

		updated = { ...updated, dateModified: new Date().toISOString() };
		await this._userEntityStorage.set(updated);
		return updated;
	}
}
