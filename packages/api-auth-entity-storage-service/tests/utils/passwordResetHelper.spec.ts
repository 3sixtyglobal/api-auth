// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { MemoryEntityStorageConnector } from "@3sixty/entity-storage-connector-memory";
import { nameof } from "@3sixty/nameof";
import type { AuthenticationPasswordReset } from "../../src/entities/authenticationPasswordReset.js";
import { initSchema } from "../../src/schema.js";
import { PasswordResetHelper } from "../../src/utils/passwordResetHelper.js";

initSchema();

describe("PasswordResetHelper", () => {
	let storage: MemoryEntityStorageConnector<AuthenticationPasswordReset>;

	beforeEach(() => {
		storage = new MemoryEntityStorageConnector<AuthenticationPasswordReset>({
			entitySchema: nameof<AuthenticationPasswordReset>(),
			config: { storageKey: "password-reset-helper" }
		});
	});

	afterEach(async () => {
		await storage.teardown();
		vi.restoreAllMocks();
	});

	test("refuses a token marked used", async () => {
		const { token } = await PasswordResetHelper.create(storage, "user-1", 30);
		const reset = (await storage.get(
			PasswordResetHelper.hashToken(token)
		)) as AuthenticationPasswordReset;
		await storage.set({ ...reset, used: true });

		await expect(PasswordResetHelper.consume(storage, token)).resolves.toBeUndefined();
	});

	test("removes only the expired tokens", async () => {
		const { token } = await PasswordResetHelper.create(storage, "user-1", 30);
		await storage.set({
			id: "expired",
			accountId: "user-2",
			expires: "2020-01-01T00:00:00.000Z",
			dateCreated: "2020-01-01T00:00:00.000Z"
		});

		await expect(PasswordResetHelper.removeExpired(storage)).resolves.toBe(1);

		const remaining = (await storage.query()).entities;
		expect(remaining.map(reset => reset.id)).toEqual([PasswordResetHelper.hashToken(token)]);
	});
});
