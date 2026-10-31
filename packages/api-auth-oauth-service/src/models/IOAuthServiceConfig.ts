// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Configuration for the OAuth service.
 */
export interface IOAuthServiceConfig {
	/**
	 * The address to send the browser to after a successful sign in.
	 */
	successRedirectUrl: string;

	/**
	 * The address to send the browser to when a sign in fails, the reason is added as the error query parameter.
	 */
	failureRedirectUrl: string;

	/**
	 * How long a sign in may take between starting and the callback, in seconds.
	 * @default 600
	 */
	transactionTtlSeconds?: number;

	/**
	 * The name of the vault key, held for the node, that signs the sign in kept by the browser. It is
	 * created when it does not exist, and kept apart from the key that signs session tokens. Set it to
	 * the session token key, auth-signing by default, to sign with that key as earlier versions did.
	 * @default auth-oauth-transaction
	 */
	transactionSigningKeyName?: string;

	/**
	 * The name of the vault key, held for the node, that signed the sign in kept by the browser in
	 * earlier versions, still accepted for a sign in started before the update.
	 * @default auth-signing
	 */
	signingKeyName?: string;
}
