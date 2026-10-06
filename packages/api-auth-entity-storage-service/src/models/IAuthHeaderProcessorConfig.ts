// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Configuration for the authentication header processor
 */
export interface IAuthHeaderProcessorConfig {
	/**
	 * The name of the key to retrieve from the vault for signing JWT.
	 * @default auth-signing
	 */
	signingKeyName?: string;

	/**
	 * The name of the cookie to use for the token.
	 * @default access_token
	 */
	cookieName?: string;

	/**
	 * Include the stack with errors.
	 */
	includeErrorStack?: boolean;

	/**
	 * The time in milliseconds a verified token is kept in the in-memory cache, counted from when it
	 * was verified and not extended by use, set to 0 to disable caching. A hit skips the vault
	 * signature check, the tenant lookup and the user lookup, so this is also the longest a password
	 * change, a user removal or a signing key rotation can go unnoticed. An entry never outlives the
	 * expiry claim of its own token either.
	 * @default 30000
	 */
	tokenCacheTtlMs?: number;

	/**
	 * The maximum number of verified tokens to hold in the in-memory cache.
	 * @default undefined (LfuCache default)
	 */
	tokenCacheCapacity?: number;

	/**
	 * Maximum time in milliseconds to wait for the token cache mutex during a cache population.
	 * @default undefined (LfuCache default)
	 */
	tokenCacheMutexTimeoutMs?: number;
}
