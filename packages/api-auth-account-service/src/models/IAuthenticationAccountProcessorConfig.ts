// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Configuration for the authentication account processor.
 */
export interface IAuthenticationAccountProcessorConfig {
	/**
	 * How long to keep the identity and organization of an account, in milliseconds, 0 disables the cache.
	 * @default 30000
	 */
	cacheTtlMs?: number;

	/**
	 * How long to keep an account without an identity, in milliseconds, 0 does not keep it. An
	 * identity the account adopts clears the entry in this process, other processes may withhold it
	 * for up to this long. It is never longer than cacheTtlMs.
	 * @default 5000
	 */
	noIdentityCacheTtlMs?: number;

	/**
	 * The maximum number of accounts to keep in the cache.
	 * @default 1000
	 */
	cacheCapacity?: number;
}
