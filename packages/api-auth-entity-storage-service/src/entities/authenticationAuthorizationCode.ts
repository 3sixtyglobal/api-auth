// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { entity, property } from "@3sixty/entity";

/**
 * Class defining the storage for a single use OAuth 2.0 authorization code for a password account.
 */
@entity()
export class AuthenticationAuthorizationCode {
	/**
	 * The hash of the code, the code itself is never stored.
	 */
	@property({ type: "string", isPrimary: true })
	public id!: string;

	/**
	 * The account the code signs in.
	 */
	@property({ type: "string", maxLength: 255, isSecondary: true })
	public accountId!: string;

	/**
	 * The address the code was sent to, which the exchange must give again.
	 */
	@property({ type: "string" })
	public redirectUri!: string;

	/**
	 * The PKCE code challenge, the base64url SHA-256 of the code verifier.
	 */
	@property({ type: "string", maxLength: 100 })
	public codeChallenge!: string;

	/**
	 * The nonce from the authorization request.
	 */
	@property({ type: "string", maxLength: 255 })
	public nonce!: string;

	/**
	 * When the code expires, in ISO date format.
	 */
	@property({ type: "string", format: "date-time" })
	public expires!: string;

	/**
	 * When the code was created, in ISO date format.
	 */
	@property({ type: "string", format: "date-time" })
	public dateCreated!: string;
}
