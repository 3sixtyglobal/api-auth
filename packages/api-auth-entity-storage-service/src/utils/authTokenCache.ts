// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { Is, type LfuCache } from "@3sixty/core";
import { nameof } from "@3sixty/nameof";
import type { IAuthTokenContext } from "../models/IAuthTokenContext.js";

/**
 * The caches of verified tokens held by the processors in this process, so ending the sessions of an
 * account clears its tokens straight away. Other processes keep their entries until their time to
 * live expires.
 */
export class AuthTokenCache {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<AuthTokenCache>();

	/**
	 * The caches in use, each with the cache keys of the tokens of each account.
	 * @internal
	 */
	private static readonly _CACHES = new Map<
		LfuCache<IAuthTokenContext>,
		Map<string, Set<string>>
	>();

	/**
	 * The number of invalidations so far, so a token verified while one ran is not kept.
	 * @internal
	 */
	private static _generation: number = 0;

	/**
	 * Get the number of invalidations so far, compare it before and after verifying a token to know
	 * whether the result may be cached.
	 * @returns The number of invalidations.
	 */
	public static generation(): number {
		return AuthTokenCache._generation;
	}

	/**
	 * Add a cache to clear when the sessions of an account end.
	 * @param cache The cache.
	 * @param accountKeys The cache keys of the tokens of each account, kept by the owner of the cache.
	 */
	public static register(
		cache: LfuCache<IAuthTokenContext>,
		accountKeys: Map<string, Set<string>>
	): void {
		AuthTokenCache._CACHES.set(cache, accountKeys);
	}

	/**
	 * Stop clearing a cache.
	 * @param cache The cache.
	 */
	public static unregister(cache: LfuCache<IAuthTokenContext>): void {
		AuthTokenCache._CACHES.delete(cache);
	}

	/**
	 * Record the cache key of a token of an account, dropping keys the cache no longer holds.
	 * @param cache The cache.
	 * @param accountKeys The cache keys of the tokens of each account.
	 * @param accountId The account id.
	 * @param cacheKey The cache key of the token.
	 */
	public static track(
		cache: LfuCache<IAuthTokenContext>,
		accountKeys: Map<string, Set<string>>,
		accountId: string,
		cacheKey: string
	): void {
		let keys = accountKeys.get(accountId);
		if (Is.empty(keys)) {
			// Accounts whose tokens have all left the cache are dropped once they outnumber the entries.
			if (accountKeys.size > cache.count() * 2) {
				for (const [otherAccountId, otherKeys] of accountKeys) {
					AuthTokenCache.prune(cache, otherKeys);
					if (otherKeys.size === 0) {
						accountKeys.delete(otherAccountId);
					}
				}
			}
			keys = new Set<string>();
			accountKeys.set(accountId, keys);
		} else {
			AuthTokenCache.prune(cache, keys);
		}
		keys.add(cacheKey);
	}

	/**
	 * Clear the tokens of an account from every cache. Account ids are unique across tenants, so the
	 * tokens are cleared whichever tenant the caller acts in.
	 * @param accountId The account id.
	 */
	public static invalidate(accountId: string): void {
		AuthTokenCache._generation++;
		for (const [cache, accountKeys] of AuthTokenCache._CACHES) {
			const keys = accountKeys.get(accountId);
			if (!Is.empty(keys)) {
				for (const key of keys) {
					cache.delete(key);
				}
				accountKeys.delete(accountId);
			}
		}
	}

	/**
	 * Drop the keys the cache no longer holds.
	 * @param cache The cache.
	 * @param keys The keys.
	 * @internal
	 */
	private static prune(cache: LfuCache<IAuthTokenContext>, keys: Set<string>): void {
		for (const key of keys) {
			if (!cache.has(key)) {
				keys.delete(key);
			}
		}
	}
}
