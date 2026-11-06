// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { GeneralError, NotFoundError } from "@3sixty/core";
import { MemoryEntityStorageConnector } from "@3sixty/entity-storage-connector-memory";
import { nameof } from "@3sixty/nameof";
import type { AuthenticationPasswordReset } from "../../src/entities/authenticationPasswordReset.js";
import type { AuthenticationUser } from "../../src/entities/authenticationUser.js";
import { initSchema } from "../../src/schema.js";
import { AccountHelper } from "../../src/utils/accountHelper.js";
import { AuthTokenCache } from "../../src/utils/authTokenCache.js";

initSchema();

describe("AccountHelper", () => {
	let userStorage: MemoryEntityStorageConnector<AuthenticationUser>;
	let resetStorage: MemoryEntityStorageConnector<AuthenticationPasswordReset>;
	let organizationRequestAdmin: { className: () => string; removeForAccount: () => Promise<void> };
	let defaultAuthorization: { component: never; modelId: string };

	function account(): AuthenticationUser {
		return {
			accountId: "user-1",
			email: "user@example.com",
			authProviderId: "3sixty",
			passwordVersion: 0,
			dateCreated: "2026-01-01T00:00:00.000Z",
			dateModified: "2026-01-01T00:00:00.000Z"
		};
	}

	async function read(): Promise<AuthenticationUser> {
		return (await userStorage.get("user-1")) as AuthenticationUser;
	}

	beforeEach(async () => {
		userStorage = new MemoryEntityStorageConnector<AuthenticationUser>({
			entitySchema: nameof<AuthenticationUser>(),
			config: { storageKey: "account-helper-user" }
		});
		resetStorage = new MemoryEntityStorageConnector<AuthenticationPasswordReset>({
			entitySchema: nameof<AuthenticationPasswordReset>(),
			config: { storageKey: "account-helper-password-reset" }
		});
		organizationRequestAdmin = {
			className: () => "organization-request-admin",
			removeForAccount: vi.fn()
		};
		defaultAuthorization = {
			component: {
				className: () => "authorization",
				removeAllRolesForSubject: vi.fn()
			} as never,
			modelId: "system"
		};
		await userStorage.set(account());
	});

	afterEach(async () => {
		await userStorage.teardown();
		await resetStorage.teardown();
		vi.restoreAllMocks();
	});

	test("writes a change", async () => {
		const user = await read();

		const written = await AccountHelper.update(userStorage, user, current => ({
			...current,
			dateLastLogin: "2026-02-01T00:00:00.000Z"
		}));

		expect(written?.dateLastLogin).toBe("2026-02-01T00:00:00.000Z");
		expect(await read()).toMatchObject({ dateLastLogin: "2026-02-01T00:00:00.000Z" });
	});

	test("writes nothing when the change has nothing to change", async () => {
		const set = vi.spyOn(userStorage, "set");

		await expect(AccountHelper.update(userStorage, await read(), () => undefined)).resolves.toBe(
			undefined
		);
		expect(set).not.toHaveBeenCalled();
	});

	test("disables an account once, ending its sessions each time", async () => {
		const invalidate = vi.spyOn(AuthTokenCache, "invalidate");

		const disabled = await AccountHelper.disable(userStorage, await read());
		const again = await AccountHelper.disable(userStorage, await read());

		expect(disabled).toMatchObject({ dateDisabled: expect.any(String), passwordVersion: 1 });
		expect(again).toBeUndefined();
		expect((await read()).passwordVersion).toBe(1);
		expect(invalidate).toHaveBeenCalledTimes(2);
	});

	test("disables an account before removing its data and roles, and removes it last", async () => {
		const order: string[] = [];
		const accountAdmin = {
			className: () => "account-admin",
			query: vi.fn(async () => {
				order.push(`data:${AccountHelper.isDisabled(await read())}`);
				return { entities: [] };
			}),
			remove: vi.fn()
		};
		const authorization = {
			className: () => "authorization",
			removeAllRolesForSubject: vi.fn(async () => {
				order.push("roles");
			})
		};

		await AccountHelper.removeAccount(
			userStorage,
			resetStorage,
			accountAdmin as never,
			organizationRequestAdmin as never,
			"user-1",
			{ component: authorization as never, modelId: "system" }
		);

		expect(order).toEqual(["data:true", "roles"]);
		expect(authorization.removeAllRolesForSubject).toHaveBeenCalledWith("system", "user-1");
		expect(await userStorage.get("user-1")).toBeUndefined();
	});

	test("carries on when removing an item has already removed a later one", async () => {
		const items = new Map([
			["identity", { id: "identity" }],
			["vc", { id: "vc" }],
			["profile", { id: "profile" }]
		]);
		const accountAdmin = {
			className: () => "account-admin",
			query: vi.fn(async () => ({ entities: [...items.values()] })),
			remove: vi.fn(async (id: string) => {
				if (!items.has(id)) {
					throw new NotFoundError("test", "accountDataNotFound", id);
				}
				items.delete(id);
				// Removing the identity also removes its credentials.
				if (id === "identity") {
					items.delete("vc");
				}
			})
		};

		await AccountHelper.removeAccount(
			userStorage,
			resetStorage,
			accountAdmin as never,
			organizationRequestAdmin as never,
			"user-1",
			defaultAuthorization
		);

		expect(items.size).toBe(0);
		expect(await userStorage.get("user-1")).toBeUndefined();
	});

	test("stops when removing an item fails for another reason", async () => {
		const accountAdmin = {
			className: () => "account-admin",
			query: vi.fn(async () => ({ entities: [{ id: "profile" }] })),
			remove: vi.fn(async () => {
				throw new GeneralError("test", "removeFailed");
			})
		};

		await expect(
			AccountHelper.removeAccount(
				userStorage,
				resetStorage,
				accountAdmin as never,
				organizationRequestAdmin as never,
				"user-1",
				defaultAuthorization
			)
		).rejects.toMatchObject({ name: "GeneralError" });
		expect(await userStorage.get("user-1")).toBeDefined();
	});

	test("removes the data of an account that is already gone", async () => {
		await userStorage.remove("user-1");
		const authorization = {
			className: () => "authorization",
			removeAllRolesForSubject: vi.fn()
		};

		const accountAdmin = {
			className: () => "account-admin",
			query: vi.fn(async () => ({ entities: [] })),
			remove: vi.fn()
		};

		await AccountHelper.removeAccount(
			userStorage,
			resetStorage,
			accountAdmin as never,
			organizationRequestAdmin as never,
			"user-1",
			{ component: authorization as never, modelId: "system" }
		);

		expect(authorization.removeAllRolesForSubject).toHaveBeenCalledWith("system", "user-1");
	});
});
