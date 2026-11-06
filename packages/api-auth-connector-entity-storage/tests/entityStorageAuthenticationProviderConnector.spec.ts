// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import {
	type AuthenticationUser,
	initSchema,
	PasswordHelper
} from "@3sixty/api-auth-entity-storage-service";
import { Converter, GeneralError, UnauthorizedError } from "@3sixty/core";
import { PasswordGenerator } from "@3sixty/crypto";
import { MemoryEntityStorageConnector } from "@3sixty/entity-storage-connector-memory";
import { EntityStorageConnectorFactory } from "@3sixty/entity-storage-models";
import { nameof } from "@3sixty/nameof";
import { EntityStorageAuthenticationProviderConnector } from "../src/entityStorageAuthenticationProviderConnector.js";

initSchema();

const SALT = "c2FsdHNhbHRzYWx0c2FsdA==";

describe("EntityStorageAuthenticationProviderConnector", () => {
	let userEntityStorage: MemoryEntityStorageConnector<AuthenticationUser>;
	let connector: EntityStorageAuthenticationProviderConnector;

	beforeEach(async () => {
		userEntityStorage = new MemoryEntityStorageConnector<AuthenticationUser>({
			entitySchema: nameof<AuthenticationUser>(),
			config: { storageKey: "authentication-user-connector" }
		});
		vi.spyOn(EntityStorageConnectorFactory, "get").mockReturnValue(userEntityStorage);

		// A legacy Blake2b hash, as stored before Argon2id.
		await userEntityStorage.set({
			accountId: "account-1",
			email: "user@example.com",
			password: await PasswordGenerator.hashPassword(
				Converter.utf8ToBytes("correct-horse-battery"),
				Converter.base64ToBytes(SALT)
			),
			salt: SALT,
			authProviderId: "3sixty",
			providerAccountId: "user@example.com",
			passwordVersion: 3,
			dateCreated: "2026-01-01T00:00:00.000Z",
			dateModified: "2026-01-01T00:00:00.000Z"
		});

		connector = new EntityStorageAuthenticationProviderConnector();
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		await userEntityStorage.teardown();
	});

	it("should register under the 3sixty provider id", () => {
		expect(EntityStorageAuthenticationProviderConnector.NAMESPACE).toBe("3sixty");
		expect(connector.className()).toBe(EntityStorageAuthenticationProviderConnector.CLASS_NAME);
	});

	it("should sign in with a password and change passwords through the api", () => {
		expect(connector.getCapabilities()).toEqual({
			type: "basic",
			signInMethod: "password",
			passwordChange: "api",
			profileReadOnly: false
		});
	});

	it("should return the identity when the password matches", async () => {
		await expect(
			connector.authenticate({ email: "user@example.com", password: "correct-horse-battery" })
		).resolves.toEqual({
			providerAccountId: "user@example.com",
			accountId: "account-1",
			email: "user@example.com"
		});
	});

	it("should replace a legacy hash with an Argon2id hash without ending the sessions", async () => {
		await connector.authenticate({ email: "user@example.com", password: "correct-horse-battery" });

		const stored = (await userEntityStorage.get("account-1")) as AuthenticationUser;
		expect(stored.passwordAlgorithm).toBe("argon2id");
		expect(stored.passwordHashParameters).toBe("t=2,m=19456,p=1");
		expect(stored.salt).not.toBe(SALT);
		expect(stored.passwordVersion).toBe(3);
		await expect(PasswordHelper.verifyPassword(stored, "correct-horse-battery")).resolves.toBe(
			true
		);

		// The new hash is used from then on.
		await expect(
			connector.authenticate({ email: "user@example.com", password: "correct-horse-battery" })
		).resolves.toMatchObject({ providerAccountId: "user@example.com" });
		expect((await userEntityStorage.get("account-1"))?.dateModified).toBe(stored.dateModified);
	});

	it("should hash again with the configured parameters", async () => {
		connector = new EntityStorageAuthenticationProviderConnector({
			config: { passwordHashOptions: { iterations: 1, memoryKiB: 8192 } }
		});

		await connector.authenticate({ email: "user@example.com", password: "correct-horse-battery" });

		expect((await userEntityStorage.get("account-1"))?.passwordHashParameters).toBe(
			"t=1,m=8192,p=1"
		);
	});

	it("should normalise a legacy e-mail address once the password matches", async () => {
		const stored = (await userEntityStorage.get("account-1")) as AuthenticationUser;
		await userEntityStorage.set({
			...stored,
			email: "User@Example.com",
			providerAccountId: "User@Example.com"
		});

		await expect(
			connector.authenticate({ email: "User@Example.com", password: "correct-horse-battery" })
		).resolves.toEqual({
			providerAccountId: "user@example.com",
			accountId: "account-1",
			email: "user@example.com"
		});
		expect(await userEntityStorage.get("account-1")).toMatchObject({
			email: "user@example.com",
			providerAccountId: "user@example.com"
		});
	});

	it("should take as long for a legacy hash as for an unknown account", async () => {
		const dummy = vi.spyOn(PasswordHelper, "dummyVerify");

		await expect(
			connector.authenticate({ email: "user@example.com", password: "wrong-password" })
		).rejects.toThrow(UnauthorizedError);
		expect(dummy).toHaveBeenCalledTimes(1);

		// An Argon2id hash is checked at the same cost, without the extra hash.
		await connector.authenticate({ email: "user@example.com", password: "correct-horse-battery" });
		dummy.mockClear();
		await expect(
			connector.authenticate({ email: "user@example.com", password: "wrong-password" })
		).rejects.toThrow(UnauthorizedError);
		expect(dummy).not.toHaveBeenCalled();
	});

	it("should fail when the upgrade cannot be written for another reason", async () => {
		vi.spyOn(userEntityStorage, "set").mockRejectedValueOnce(
			new GeneralError("memoryEntityStorageConnector", "setFailed")
		);

		await expect(
			connector.authenticate({ email: "user@example.com", password: "correct-horse-battery" })
		).rejects.toMatchObject({ name: GeneralError.CLASS_NAME });
	});

	it("should reject a wrong password", async () => {
		await expect(
			connector.authenticate({ email: "user@example.com", password: "wrong-password" })
		).rejects.toThrow(UnauthorizedError);
		expect((await userEntityStorage.get("account-1"))?.passwordAlgorithm).toBeUndefined();
	});

	it("should reject an unknown e-mail address after computing a hash", async () => {
		const dummy = vi.spyOn(PasswordHelper, "dummyVerify");

		await expect(
			connector.authenticate({ email: "missing@example.com", password: "correct-horse-battery" })
		).rejects.toThrow(UnauthorizedError);
		expect(dummy).toHaveBeenCalled();
	});

	it("should not match an account from another provider with the same e-mail address", async () => {
		await userEntityStorage.remove("account-1");
		await userEntityStorage.set({
			accountId: "account-2",
			email: "user@example.com",
			authProviderId: "google",
			providerAccountId: "google-subject-1",
			dateCreated: "2026-01-01T00:00:00.000Z",
			dateModified: "2026-01-01T00:00:00.000Z"
		});

		await expect(
			connector.authenticate({ email: "user@example.com", password: "correct-horse-battery" })
		).rejects.toThrow(UnauthorizedError);
	});

	it("should guard the credentials", async () => {
		await expect(
			connector.authenticate({ email: "", password: "correct-horse-battery" })
		).rejects.toMatchObject({ name: "GuardError" });
	});
});
