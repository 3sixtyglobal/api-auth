// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { DurationConstants, LfuCache } from "@3sixty/core";
import type { IAuthTokenContext } from "../../src/models/IAuthTokenContext.js";
import { AuthTokenCache } from "../../src/utils/authTokenCache.js";

describe("AuthTokenCache", () => {
	let cache: LfuCache<IAuthTokenContext>;
	let accountKeys: Map<string, Set<string>>;

	beforeEach(() => {
		cache = new LfuCache<IAuthTokenContext>({ ttiMs: DurationConstants.MsPerMinute });
		accountKeys = new Map<string, Set<string>>();
		AuthTokenCache.register(cache, accountKeys);
	});

	afterEach(() => {
		AuthTokenCache.unregister(cache);
		cache.destroy();
	});

	it("clears every token of an account and only that account", () => {
		for (const [key, accountId] of [
			["token-1", "account-1"],
			["token-2", "account-1"],
			["token-3", "account-2"]
		]) {
			cache.set(key, { accountId });
			AuthTokenCache.track(cache, accountKeys, accountId, key);
		}

		AuthTokenCache.invalidate("account-1");

		expect(cache.has("token-1")).toBe(false);
		expect(cache.has("token-2")).toBe(false);
		expect(cache.has("token-3")).toBe(true);
		expect(accountKeys.has("account-1")).toBe(false);
	});

	it("counts the invalidations", () => {
		const generation = AuthTokenCache.generation();

		AuthTokenCache.invalidate("account-1");

		expect(AuthTokenCache.generation()).toBe(generation + 1);
	});

	it("leaves a cache once it is unregistered", () => {
		cache.set("token-1", { accountId: "account-1" });
		AuthTokenCache.track(cache, accountKeys, "account-1", "token-1");
		AuthTokenCache.unregister(cache);

		AuthTokenCache.invalidate("account-1");

		expect(cache.has("token-1")).toBe(true);
	});

	it("drops the keys of tokens the cache no longer holds", () => {
		cache.set("token-1", { accountId: "account-1" });
		AuthTokenCache.track(cache, accountKeys, "account-1", "token-1");
		cache.delete("token-1");

		cache.set("token-2", { accountId: "account-1" });
		AuthTokenCache.track(cache, accountKeys, "account-1", "token-2");

		expect([...(accountKeys.get("account-1") ?? [])]).toEqual(["token-2"]);
	});

	it("drops accounts without cached tokens once they outnumber the cache entries", () => {
		for (let i = 0; i < 3; i++) {
			cache.set(`token-${i}`, { accountId: `account-${i}` });
			AuthTokenCache.track(cache, accountKeys, `account-${i}`, `token-${i}`);
			cache.delete(`token-${i}`);
		}

		cache.set("token-3", { accountId: "account-3" });
		AuthTokenCache.track(cache, accountKeys, "account-3", "token-3");

		expect([...accountKeys.keys()]).toEqual(["account-3"]);
	});
});
