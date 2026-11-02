// Copyright 2026 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { entity, property } from "@3sixty/entity";

/**
 * Account storage after authorization removed the stored scope, and before each account had its own id.
 */
@entity({ version: 1 })
export class AuthenticationUserV1 {
	/**
	 * The user e-mail address.
	 */
	@property({ type: "string", format: "email", isPrimary: true })
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
	 * The user identity.
	 */
	@property({ type: "string", maxLength: 255, isSecondary: true })
	public identity!: string;

	/**
	 * The users organization.
	 */
	@property({ type: "string", maxLength: 255 })
	public organization!: string;

	/**
	 * The password version counter, incremented on every password change to invalidate existing tokens.
	 */
	@property({ type: "integer", optional: true })
	public passwordVersion?: number;
}
