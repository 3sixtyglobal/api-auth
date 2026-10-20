// Copyright 2024 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { entity, property } from "@3sixty/entity";

/**
 * Class defining the storage for user login credentials.
 */
@entity()
export class AuthenticationUser {
	/**
	 * The user e-mail address.
	 */
	@property({ type: "string", isPrimary: true })
	public email!: string;

	/**
	 * The encrypted password for the user.
	 */
	@property({ type: "string" })
	public password!: string;

	/**
	 * The salt for the password.
	 */
	@property({ type: "string" })
	public salt!: string;

	/**
	 * Stable identifier of the account. This is the token subject.
	 */
	@property({ type: "string", isSecondary: true })
	public userId!: string;

	/**
	 * The DID attached to the account, once one has been adopted.
	 */
	@property({ type: "string", isSecondary: true, optional: true })
	public identity?: string;

	/**
	 * The users organization.
	 */
	@property({ type: "string" })
	public organization!: string;

	/**
	 * The scope assigned to the user, comma separated.
	 */
	@property({ type: "string" })
	public scope!: string;

	/**
	 * The password version counter, incremented on every password change to invalidate existing tokens.
	 */
	@property({ type: "integer", optional: true })
	public passwordVersion?: number;
}
