// Copyright 2024 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { entity, property } from "@3sixty/entity";

/**
 * Class defining the storage for user login credentials.
 */
@entity({ version: 2 })
export class AuthenticationUser {
	/**
	 * Stable identifier of the account. This is the token subject.
	 */
	@property({ type: "string", maxLength: 255, isPrimary: true })
	public accountId!: string;

	/**
	 * The user e-mail address.
	 */
	@property({ type: "string", format: "email", isSecondary: true })
	public email!: string;

	/**
	 * The encrypted password for the user, absent for accounts that sign in through a provider.
	 */
	@property({ type: "string", optional: true })
	public password?: string;

	/**
	 * The salt for the password.
	 */
	@property({ type: "string", optional: true })
	public salt?: string;

	/**
	 * The identifier of the provider that authenticates the account.
	 */
	@property({ type: "string", maxLength: 100 })
	public authProviderId!: string;

	/**
	 * The account identifier issued by the provider, such as the OpenID Connect subject.
	 */
	@property({ type: "string", maxLength: 255, isSecondary: true, optional: true })
	public providerAccountId?: string;

	/**
	 * The tenant the provider signed the account in from, such as the Microsoft tenant id, from its
	 * last sign in.
	 */
	@property({ type: "string", maxLength: 100, optional: true })
	public providerTenantId?: string;

	/**
	 * The password version counter, incremented on every password change to invalidate existing tokens.
	 */
	@property({ type: "integer", optional: true })
	public passwordVersion?: number;

	/**
	 * When the account was created, in ISO date format.
	 */
	@property({ type: "string", format: "date-time" })
	public dateCreated!: string;

	/**
	 * When the account was last modified, in ISO date format.
	 */
	@property({ type: "string", format: "date-time" })
	public dateModified!: string;

	/**
	 * When the account last logged in, in ISO date format.
	 */
	@property({ type: "string", format: "date-time", optional: true })
	public dateLastLogin?: string;

	/**
	 * When the account was disabled, in ISO date format, a disabled account cannot sign in.
	 */
	@property({ type: "string", format: "date-time", optional: true })
	public dateDisabled?: string;

	/**
	 * False until the e-mail address of a self sign up is verified, absent means verified.
	 */
	@property({ type: "boolean", optional: true })
	public verified?: boolean;

	/**
	 * The algorithm of the password hash, absent for the legacy Blake2b hash.
	 */
	@property({ type: "string", maxLength: 50, optional: true })
	public passwordAlgorithm?: string;

	/**
	 * The parameters of the password hash, such as t=2,m=19456,p=1 for Argon2id.
	 */
	@property({ type: "string", maxLength: 100, optional: true })
	public passwordHashParameters?: string;
}
