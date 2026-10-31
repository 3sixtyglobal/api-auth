// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { entity, property } from "@3sixty/entity";

/**
 * Class defining the storage for a single use token to reset a forgotten password or verify a sign up.
 */
@entity()
export class AuthenticationPasswordReset {
	/**
	 * The hash of the token, the token itself is never stored.
	 */
	@property({ type: "string", isPrimary: true })
	public id!: string;

	/**
	 * The account the token resets the password of.
	 */
	@property({ type: "string", maxLength: 255, isSecondary: true })
	public accountId!: string;

	/**
	 * When the token expires, in ISO date format.
	 */
	@property({ type: "string", format: "date-time" })
	public expires!: string;

	/**
	 * When the token was created, in ISO date format.
	 */
	@property({ type: "string", format: "date-time" })
	public dateCreated!: string;

	/**
	 * What the token is for, absent for a password reset.
	 */
	@property({ type: "string", maxLength: 50, optional: true })
	public purpose?: string;

	/**
	 * The password hash given with a sign up, set on the account when the token is verified.
	 */
	@property({ type: "string", optional: true })
	public password?: string;

	/**
	 * The salt of the password hash.
	 */
	@property({ type: "string", optional: true })
	public salt?: string;

	/**
	 * The algorithm of the password hash.
	 */
	@property({ type: "string", maxLength: 50, optional: true })
	public passwordAlgorithm?: string;

	/**
	 * The parameters of the password hash.
	 */
	@property({ type: "string", maxLength: 100, optional: true })
	public passwordHashParameters?: string;

	/**
	 * True once the token has been used, before it is removed.
	 */
	@property({ type: "boolean", optional: true })
	public used?: boolean;
}
