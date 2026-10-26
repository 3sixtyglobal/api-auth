// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { RandomHelper } from "@3sixty/core";
import { initSchema } from "../src/schema.js";
import { migrateAuthenticationUser } from "./helpers/migrateAuthenticationUser.js";

initSchema();

describe("AuthenticationUser migration", () => {
	const storedAccount = {
		email: "user@example.com",
		password: "stored-password-hash",
		salt: "c2FsdA==",
		identity: "did:user:123",
		organization: "did:org:456",
		passwordVersion: 2
	};

	beforeEach(() => {
		vi.restoreAllMocks();
		vi.spyOn(RandomHelper, "generateUuidV7").mockReturnValue("account-1");
	});

	test("gives a version 1 account its own id and keeps the identity", async () => {
		const migrated = await migrateAuthenticationUser(storedAccount, 1);

		expect(migrated.userId).toBe("account-1");
		expect(migrated.identity).toBe("did:user:123");
		expect(migrated.email).toBe("user@example.com");
		expect(migrated.organization).toBe("did:org:456");
		expect(migrated.passwordVersion).toBe(2);
	});

	test("drops the stored scope from a version 0 account and keeps the identity", async () => {
		const migrated = await migrateAuthenticationUser({ ...storedAccount, scope: "read" }, 0);

		expect(migrated.userId).toBe("account-1");
		expect(migrated.identity).toBe("did:user:123");
		expect(migrated).not.toHaveProperty("scope");
	});
});
