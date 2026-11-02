// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { ContextIdKeys, ContextIdStore } from "@3sixty/context";
import { Is, type LfuCache } from "@3sixty/core";
import { nameof } from "@3sixty/nameof";
import type { IAuthenticationAccountContext } from "../models/IAuthenticationAccountContext.js";

/**
 * The caches of the account identity and organization held by the processors in this process, so
 * a change to the account data clears the cached account straight away. Other processes keep their
 * entry until its time to live expires.
 */
export class AccountContextCache {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<AccountContextCache>();

	/**
	 * The caches in use.
	 * @internal
	 */
	private static readonly _CACHES = new Set<LfuCache<IAuthenticationAccountContext>>();

	/**
	 * The generation of each account with a load in progress, raised when the account is cleared so a
	 * load that started before is not stored. Entries are removed once no load is in progress.
	 * @internal
	 */
	private static readonly _LOADS = new Map<string, { generation: number; count: number }>();

	/**
	 * Add a cache to clear when an account changes.
	 * @param cache The cache.
	 */
	public static register(cache: LfuCache<IAuthenticationAccountContext>): void {
		AccountContextCache._CACHES.add(cache);
	}

	/**
	 * Stop clearing a cache.
	 * @param cache The cache.
	 */
	public static unregister(cache: LfuCache<IAuthenticationAccountContext>): void {
		AccountContextCache._CACHES.delete(cache);
	}

	/**
	 * Get the cache key of an account, account data is partitioned by tenant.
	 * @param tenantId The tenant id.
	 * @param accountId The account id.
	 * @returns The key.
	 */
	public static key(tenantId: string | undefined, accountId: string): string {
		return `${tenantId ?? ""}:${accountId}`;
	}

	/**
	 * Get the current generation of an account, it changes whenever the account is cleared while a
	 * load is in progress.
	 * @param key The cache key of the account.
	 * @returns The generation.
	 */
	public static generation(key: string): number {
		return AccountContextCache._LOADS.get(key)?.generation ?? 0;
	}

	/**
	 * Record the start of a load of an account.
	 * @param key The cache key of the account.
	 * @returns The generation of the account when the load started.
	 */
	public static loadStarted(key: string): number {
		let load = AccountContextCache._LOADS.get(key);
		if (Is.empty(load)) {
			load = { generation: 0, count: 0 };
			AccountContextCache._LOADS.set(key, load);
		}
		load.count++;
		return load.generation;
	}

	/**
	 * Record the end of a load of an account.
	 * @param key The cache key of the account.
	 * @param generation The generation returned when the load started.
	 * @returns True when the account was not cleared during the load, so the result may be stored.
	 */
	public static loadEnded(key: string, generation: number): boolean {
		const load = AccountContextCache._LOADS.get(key);
		if (Is.empty(load)) {
			return false;
		}
		load.count--;
		if (load.count <= 0) {
			AccountContextCache._LOADS.delete(key);
		}
		return load.generation === generation;
	}

	/**
	 * Clear an account of the current tenant from every cache, and from any load in progress.
	 * @param accountId The account id.
	 * @returns A promise that resolves when the account has been cleared.
	 */
	public static async invalidate(accountId: string): Promise<void> {
		if (AccountContextCache._CACHES.size === 0) {
			return;
		}
		const contextIds = await ContextIdStore.getContextIds();
		const key = AccountContextCache.key(contextIds?.[ContextIdKeys.Tenant], accountId);
		const load = AccountContextCache._LOADS.get(key);
		if (!Is.empty(load)) {
			load.generation++;
		}
		for (const cache of AccountContextCache._CACHES) {
			cache.delete(key);
		}
	}
}
