// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IHttpResponse } from "@3sixty/api-models";
import { ContextIdKeys, type IContextIds } from "@3sixty/context";
import { LfuCache } from "@3sixty/core";
import { MemoryEntityStorageConnector } from "@3sixty/entity-storage-connector-memory";
import { EntityStorageConnectorFactory } from "@3sixty/entity-storage-models";
import { nameof } from "@3sixty/nameof";
import type { AccountData } from "../../src/entities/accountData.js";
import { AuthenticationAccountProcessor } from "../../src/processors/authenticationAccountProcessor.js";
import { initSchema } from "../../src/schema.js";
import { AccountContextCache } from "../../src/utils/accountContextCache.js";
import { AccountDataHelper } from "../../src/utils/accountDataHelper.js";
import { identityData, organizationData } from "../helpers/accountDataValues.js";

initSchema();

describe("AuthenticationAccountProcessor", () => {
	let storage: MemoryEntityStorageConnector<AccountData>;
	let processor: AuthenticationAccountProcessor;

	/**
	 * Run the processor for a route.
	 * @param contextIds The context IDs of the request.
	 * @param route The route, an authenticated route when omitted.
	 * @param route.skipAuth Whether the route is public.
	 * @returns The context IDs after the processor ran.
	 */
	async function runPre(
		contextIds: IContextIds,
		route: { skipAuth?: boolean } = {}
	): Promise<IContextIds> {
		const response: IHttpResponse = {};
		await processor.pre({ headers: {} } as never, response, route as never, contextIds, {});
		return contextIds;
	}

	beforeEach(async () => {
		storage = new MemoryEntityStorageConnector<AccountData>({
			entitySchema: nameof<AccountData>(),
			config: { storageKey: "account-data-processor" }
		});
		vi.spyOn(EntityStorageConnectorFactory, "get").mockReturnValue(storage);

		await AccountDataHelper.create(
			storage,
			"account-1",
			"identity",
			identityData("did:example:user")
		);
		await AccountDataHelper.create(
			storage,
			"account-1",
			"organization",
			organizationData("did:example:org")
		);

		processor = new AuthenticationAccountProcessor();
	});

	afterEach(async () => {
		await processor.stop();
		vi.restoreAllMocks();
		await storage.teardown();
	});

	it("should set the identity and organization of the signed in account", async () => {
		const contextIds = await runPre({ [ContextIdKeys.Account]: "account-1" });

		expect(contextIds[ContextIdKeys.User]).toBe("did:example:user");
		expect(contextIds[ContextIdKeys.UserOrganization]).toBe("did:example:org");
	});

	it("should read storage once while the account is cached", async () => {
		const querySpy = vi.spyOn(storage, "query");

		await runPre({ [ContextIdKeys.Account]: "account-1" });
		await runPre({ [ContextIdKeys.Account]: "account-1" });

		// The identity and organization each take a single query.
		expect(querySpy).toHaveBeenCalledTimes(2);
	});

	it("should read storage on every request when the cache is disabled", async () => {
		await processor.stop();
		processor = new AuthenticationAccountProcessor({ config: { cacheTtlMs: 0 } });
		const querySpy = vi.spyOn(storage, "query");

		const contextIds = await runPre({ [ContextIdKeys.Account]: "account-1" });
		await runPre({ [ContextIdKeys.Account]: "account-1" });

		expect(contextIds[ContextIdKeys.User]).toBe("did:example:user");
		expect(querySpy).toHaveBeenCalledTimes(4);
	});

	it("should leave the context alone for an account without an identity", async () => {
		const contextIds = await runPre({ [ContextIdKeys.Account]: "account-2" });

		expect(contextIds[ContextIdKeys.User]).toBeUndefined();
		expect(contextIds[ContextIdKeys.UserOrganization]).toBeUndefined();
	});

	it("should not use a value that is not in its JSON-LD shape", async () => {
		const now = new Date().toISOString();
		for (const [id, type] of [
			["raw-identity", "identity"],
			["raw-organization", "organization"]
		]) {
			await storage.set({
				id,
				accountId: "account-5",
				type,
				data: "did:example:raw",
				isDefault: true,
				dateCreated: now,
				dateModified: now
			});
		}

		const contextIds = await runPre({ [ContextIdKeys.Account]: "account-5" });

		expect(contextIds[ContextIdKeys.User]).toBeUndefined();
		expect(contextIds[ContextIdKeys.UserOrganization]).toBeUndefined();
	});

	it("should clear an account without an identity when it adopts one, so it is used at once", async () => {
		const before = await runPre({ [ContextIdKeys.Account]: "account-2" });
		await AccountDataHelper.createIdentity(storage, "account-2", "did:example:adopted");
		const after = await runPre({ [ContextIdKeys.Account]: "account-2" });

		expect(before[ContextIdKeys.User]).toBeUndefined();
		expect(after[ContextIdKeys.User]).toBe("did:example:adopted");
	});

	it("should keep an account without an identity only briefly", async () => {
		const querySpy = vi.spyOn(storage, "query");
		vi.useFakeTimers({ toFake: ["Date"] });
		try {
			await runPre({ [ContextIdKeys.Account]: "account-2" });
			await runPre({ [ContextIdKeys.Account]: "account-2" });
			expect(querySpy).toHaveBeenCalledTimes(2);

			vi.setSystemTime(Date.now() + 6000);
			await runPre({ [ContextIdKeys.Account]: "account-2" });
			expect(querySpy).toHaveBeenCalledTimes(4);
		} finally {
			vi.useRealTimers();
		}
	});

	it("should not keep an account without an identity when configured not to", async () => {
		await processor.stop();
		processor = new AuthenticationAccountProcessor({ config: { noIdentityCacheTtlMs: 0 } });
		const querySpy = vi.spyOn(storage, "query");

		await runPre({ [ContextIdKeys.Account]: "account-2" });
		await runPre({ [ContextIdKeys.Account]: "account-2" });

		expect(querySpy).toHaveBeenCalledTimes(4);
	});

	it("should share one load between concurrent requests for an account", async () => {
		const querySpy = vi.spyOn(storage, "query");

		const [first, second] = await Promise.all([
			runPre({ [ContextIdKeys.Account]: "account-1" }),
			runPre({ [ContextIdKeys.Account]: "account-1" })
		]);

		expect(first[ContextIdKeys.User]).toBe("did:example:user");
		expect(second[ContextIdKeys.UserOrganization]).toBe("did:example:org");
		expect(querySpy).toHaveBeenCalledTimes(2);
	});

	/**
	 * Hold the results of the storage queries until released, the values are read straight away so a
	 * load holds the values from before any change made while it waits.
	 * @returns The query spy and the function to release the results.
	 */
	function holdQueries(): { querySpy: ReturnType<typeof vi.spyOn>; release: () => void } {
		const query = storage.query.bind(storage);
		let release: () => void = () => {};
		const gate = new Promise<void>(resolve => {
			release = resolve;
		});
		const querySpy = vi
			.spyOn(storage, "query")
			.mockImplementation(async (...args: Parameters<typeof storage.query>) => {
				const result = await query(...args);
				await gate;
				return result;
			});
		return { querySpy, release };
	}

	it("should not cache an account loaded before it was cleared", async () => {
		const organizations = await AccountDataHelper.query(storage, "account-1", "organization");
		const { querySpy, release } = holdQueries();

		const stale = runPre({ [ContextIdKeys.Account]: "account-1" });
		await vi.waitFor(() => expect(querySpy).toHaveBeenCalledTimes(2));
		await AccountDataHelper.updateItem(
			storage,
			organizations.entities[0],
			organizationData("did:example:org-new")
		);
		release();

		expect((await stale)[ContextIdKeys.UserOrganization]).toBe("did:example:org");
		querySpy.mockRestore();
		const after = await runPre({ [ContextIdKeys.Account]: "account-1" });
		expect(after[ContextIdKeys.UserOrganization]).toBe("did:example:org-new");
	});

	it("should not share a load that started before the account was cleared", async () => {
		const organizations = await AccountDataHelper.query(storage, "account-1", "organization");
		const { querySpy, release } = holdQueries();

		const stale = runPre({ [ContextIdKeys.Account]: "account-1" });
		await vi.waitFor(() => expect(querySpy).toHaveBeenCalledTimes(2));
		await AccountDataHelper.updateItem(
			storage,
			organizations.entities[0],
			organizationData("did:example:org-new")
		);
		const fresh = runPre({ [ContextIdKeys.Account]: "account-1" });
		release();

		expect((await stale)[ContextIdKeys.UserOrganization]).toBe("did:example:org");
		expect((await fresh)[ContextIdKeys.UserOrganization]).toBe("did:example:org-new");
		expect(querySpy).toHaveBeenCalledTimes(4);
	});

	it("should do nothing without a signed in account or on a public route", async () => {
		const querySpy = vi.spyOn(storage, "query");

		const anonymous = await runPre({});
		const publicRoute = await runPre({ [ContextIdKeys.Account]: "account-1" }, { skipAuth: true });
		const noRoute: IContextIds = { [ContextIdKeys.Account]: "account-1" };
		await processor.pre({ headers: {} } as never, {}, undefined, noRoute, {});

		expect(anonymous[ContextIdKeys.User]).toBeUndefined();
		expect(publicRoute[ContextIdKeys.User]).toBeUndefined();
		expect(noRoute[ContextIdKeys.User]).toBeUndefined();
		expect(querySpy).not.toHaveBeenCalled();
	});

	it("should use the default organization when the account has several", async () => {
		await AccountDataHelper.create(
			storage,
			"account-3",
			"organization",
			organizationData("did:example:org-a")
		);
		await AccountDataHelper.create(
			storage,
			"account-3",
			"organization",
			organizationData("did:example:org-b"),
			true
		);

		const contextIds = await runPre({ [ContextIdKeys.Account]: "account-3" });

		expect(contextIds[ContextIdKeys.UserOrganization]).toBe("did:example:org-b");
	});

	it("should use the earliest organization when none is the default", async () => {
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(new Date("2026-01-02T00:00:00.000Z"));
		await AccountDataHelper.create(
			storage,
			"account-4",
			"organization",
			organizationData("did:example:org-later")
		);
		vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
		await AccountDataHelper.create(
			storage,
			"account-4",
			"organization",
			organizationData("did:example:org-first")
		);
		vi.useRealTimers();

		const contextIds = await runPre({ [ContextIdKeys.Account]: "account-4" });

		expect(contextIds[ContextIdKeys.UserOrganization]).toBe("did:example:org-first");
	});

	it("should clear a cached account when its identity or organization changes", async () => {
		const before = await runPre({ [ContextIdKeys.Account]: "account-1" });
		const organizations = await AccountDataHelper.query(storage, "account-1", "organization");
		await AccountDataHelper.remove(storage, organizations.entities[0].id);
		await AccountDataHelper.create(
			storage,
			"account-1",
			"organization",
			organizationData("did:example:org-new")
		);
		const after = await runPre({ [ContextIdKeys.Account]: "account-1" });

		expect(before[ContextIdKeys.UserOrganization]).toBe("did:example:org");
		expect(after[ContextIdKeys.UserOrganization]).toBe("did:example:org-new");
	});

	it("should keep a cached account when other account data changes", async () => {
		await runPre({ [ContextIdKeys.Account]: "account-1" });
		await AccountDataHelper.create(storage, "account-1", "profile", { name: "Alice" });
		const querySpy = vi.spyOn(storage, "query");
		await runPre({ [ContextIdKeys.Account]: "account-1" });

		expect(querySpy).not.toHaveBeenCalled();
	});

	it("should stop clearing the cache of a stopped processor", async () => {
		const deleteSpy = vi.spyOn(LfuCache.prototype, "delete");
		await processor.stop();
		await AccountContextCache.invalidate("account-1");

		expect(deleteSpy).not.toHaveBeenCalled();
		processor = new AuthenticationAccountProcessor();
	});

	it("should keep accounts of different tenants apart in the cache", async () => {
		const tenantA = await runPre({
			[ContextIdKeys.Account]: "account-1",
			[ContextIdKeys.Tenant]: "tenant-a"
		});
		const querySpy = vi.spyOn(storage, "query");
		await runPre({ [ContextIdKeys.Account]: "account-1", [ContextIdKeys.Tenant]: "tenant-b" });

		expect(tenantA[ContextIdKeys.User]).toBe("did:example:user");
		expect(querySpy).toHaveBeenCalledTimes(2);
	});
});
