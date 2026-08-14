// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuthenticationAuditComponent } from "@twin.org/api-auth-entity-storage-models";
import { ContextIdKeys, ContextIdStore } from "@twin.org/context";
import { ComponentFactory, GeneralError, RandomHelper } from "@twin.org/core";
import { PasswordGenerator, PasswordValidator } from "@twin.org/crypto";
import { MemoryEntityStorageConnector } from "@twin.org/entity-storage-connector-memory";
import { EntityStorageConnectorFactory } from "@twin.org/entity-storage-models";
import { nameof } from "@twin.org/nameof";
import type { AuthenticationUser } from "../../src/entities/authenticationUser.js";
import { initSchema } from "../../src/schema.js";
import { EntityStorageAuthenticationAdminService } from "../../src/services/entityStorageAuthenticationAdminService.js";

initSchema();

describe("EntityStorageAuthenticationAdminService", () => {
	let mockAuthenticationAuditService: IAuthenticationAuditComponent;
	let userEntityStorage: MemoryEntityStorageConnector<AuthenticationUser>;
	let service: EntityStorageAuthenticationAdminService;

	beforeEach(() => {
		vi.restoreAllMocks();

		mockAuthenticationAuditService = {
			className: vi.fn().mockReturnValue("AuthenticationAuditService"),
			create: vi.fn(),
			get: vi.fn(),
			update: vi.fn(),
			remove: vi.fn(),
			query: vi.fn()
		};

		userEntityStorage = new MemoryEntityStorageConnector<AuthenticationUser>({
			entitySchema: nameof<AuthenticationUser>(),
			config: { storageKey: "authentication-user" }
		});

		vi.spyOn(EntityStorageConnectorFactory, "get").mockReturnValue(userEntityStorage);
		vi.spyOn(ComponentFactory, "getIfExists").mockImplementation(componentName => {
			if (componentName === "authentication-audit") {
				return mockAuthenticationAuditService;
			}
			return undefined;
		});

		service = new EntityStorageAuthenticationAdminService({
			config: {
				minPasswordLength: 10
			}
		});
	});

	afterEach(async () => {
		await userEntityStorage.teardown();
	});

	it("should return the class name", () => {
		expect(service.className()).toBe(EntityStorageAuthenticationAdminService.CLASS_NAME);
	});

	it("should create a new user with normalised scopes", async () => {
		vi.spyOn(PasswordValidator, "validatePassword").mockImplementation(() => {});
		vi.spyOn(RandomHelper, "generate").mockReturnValue(new Uint8Array([1, 2, 3, 4]));
		vi.spyOn(PasswordGenerator, "hashPassword").mockResolvedValue("hashed-password");

		await service.create({
			email: "user@example.com",
			password: "correct-horse-battery",
			userIdentity: "did:user:123",
			organizationIdentity: "did:org:456",
			scope: [" Read ", "WRITE"]
		});

		expect(PasswordValidator.validatePassword).toHaveBeenCalledWith("correct-horse-battery", {
			minLength: 10
		});
		expect(await userEntityStorage.get("user@example.com")).toEqual({
			email: "user@example.com",
			salt: "AQIDBA==",
			password: "hashed-password",
			identity: "did:user:123",
			organization: "did:org:456",
			scope: "read,write",
			passwordVersion: 0
		});
		expect(mockAuthenticationAuditService.create).toHaveBeenCalledWith({
			actorId: "user@example.com",
			event: "account-created",
			data: {
				userIdentity: "did:user:123",
				organizationIdentity: "did:org:456",
				scope: [" Read ", "WRITE"]
			}
		});
	});

	it("should wrap create failures when the user already exists", async () => {
		await userEntityStorage.set({
			email: "user@example.com",
			password: "stored-password",
			salt: "AQIDBA==",
			identity: "did:user:123",
			organization: "did:org:456",
			scope: "read"
		});
		vi.spyOn(PasswordValidator, "validatePassword").mockImplementation(() => {});

		await expect(
			service.create({
				email: "user@example.com",
				password: "correct-horse-battery",
				userIdentity: "did:user:123",
				organizationIdentity: "did:org:456",
				scope: ["read"]
			})
		).rejects.toThrow(GeneralError);
		expect(await userEntityStorage.get("user@example.com")).toMatchObject({
			password: "stored-password"
		});
	});

	it("should wrap create failures when password validation fails", async () => {
		vi.spyOn(PasswordValidator, "validatePassword").mockImplementation(() => {
			throw new Error("password too short");
		});

		await expect(
			service.create({
				email: "user@example.com",
				password: "short",
				userIdentity: "did:user:123",
				organizationIdentity: "did:org:456",
				scope: ["read"]
			})
		).rejects.toThrow(GeneralError);
		expect(await userEntityStorage.get("user@example.com")).toBeUndefined();
	});

	it("should update an existing user and normalise scopes", async () => {
		await userEntityStorage.set({
			email: "user@example.com",
			password: "stored-password",
			salt: "AQIDBA==",
			identity: "did:user:123",
			organization: "did:org:456",
			scope: "read"
		});

		await service.update({
			email: "user@example.com",
			organizationIdentity: "did:org:999",
			scope: [" Admin ", "WRITE"]
		});

		expect(await userEntityStorage.get("user@example.com")).toEqual({
			email: "user@example.com",
			password: "stored-password",
			salt: "AQIDBA==",
			identity: "did:user:123",
			organization: "did:org:999",
			scope: "admin,write"
		});
		expect(mockAuthenticationAuditService.create).toHaveBeenCalledWith({
			actorId: "user@example.com",
			event: "account-updated",
			data: {
				updatedFields: ["organizationIdentity", "scope"],
				userIdentity: "did:user:123",
				organizationIdentity: "did:org:999",
				scope: ["admin", "write"]
			}
		});
	});

	it("should wrap update failures when the user is missing", async () => {
		await expect(
			service.update({
				email: "missing@example.com",
				userIdentity: "did:user:123"
			})
		).rejects.toThrow(GeneralError);
		expect(await userEntityStorage.get("missing@example.com")).toBeUndefined();
	});

	it("should get a user by email", async () => {
		await userEntityStorage.set({
			email: "user@example.com",
			password: "stored-password",
			salt: "AQIDBA==",
			identity: "did:user:123",
			organization: "did:org:456",
			scope: "read,write"
		});

		const result = await service.get("user@example.com");

		expect(result).toEqual({
			email: "user@example.com",
			userIdentity: "did:user:123",
			organizationIdentity: "did:org:456",
			scope: ["read", "write"]
		});
	});

	it("should get a user by identity", async () => {
		await userEntityStorage.set({
			email: "user@example.com",
			password: "stored-password",
			salt: "AQIDBA==",
			identity: "did:user:123",
			organization: "did:org:456",
			scope: "read,write"
		});

		const result = await service.getByIdentity("did:user:123");

		expect(result).toEqual({
			email: "user@example.com",
			userIdentity: "did:user:123",
			organizationIdentity: "did:org:456",
			scope: ["read", "write"]
		});
	});

	it("should wrap getByIdentity failures when the user is missing", async () => {
		await expect(service.getByIdentity("did:user:missing")).rejects.toThrow(GeneralError);
	});

	it("should wrap get failures when the user is missing", async () => {
		await expect(service.get("missing@example.com")).rejects.toThrow(GeneralError);
	});

	it("should remove an existing user", async () => {
		await userEntityStorage.set({
			email: "user@example.com",
			password: "stored-password",
			salt: "AQIDBA==",
			identity: "did:user:123",
			organization: "did:org:456",
			scope: "read"
		});

		await service.remove("user@example.com");

		expect(await userEntityStorage.get("user@example.com")).toBeUndefined();
		expect(mockAuthenticationAuditService.create).toHaveBeenCalledWith({
			actorId: "user@example.com",
			event: "account-deleted",
			data: {
				userIdentity: "did:user:123",
				organizationIdentity: "did:org:456",
				scope: ["read"]
			}
		});
	});

	it("should wrap remove failures when the user is missing", async () => {
		const removeSpy = vi.spyOn(userEntityStorage, "remove");

		await expect(service.remove("missing@example.com")).rejects.toThrow(GeneralError);
		expect(removeSpy).not.toHaveBeenCalled();
	});

	it("should update the password when the current password matches", async () => {
		await userEntityStorage.set({
			email: "user@example.com",
			password: "stored-password",
			salt: "AQIDBA==",
			identity: "did:user:123",
			organization: "did:org:456",
			scope: "read,write"
		});
		vi.spyOn(PasswordValidator, "validatePassword").mockImplementation(() => {});
		vi.spyOn(PasswordValidator, "comparePasswordHashes").mockReturnValue(true);
		vi.spyOn(RandomHelper, "generate").mockReturnValue(new Uint8Array([9, 8, 7, 6]));
		vi.spyOn(PasswordGenerator, "hashPassword")
			.mockResolvedValueOnce("current-password-hash")
			.mockResolvedValueOnce("new-password-hash");

		await service.updatePassword("user@example.com", "better-password-value", "current-password");

		expect(await userEntityStorage.get("user@example.com")).toEqual({
			email: "user@example.com",
			salt: "CQgHBg==",
			password: "new-password-hash",
			identity: "did:user:123",
			organization: "did:org:456",
			scope: "read,write",
			passwordVersion: 1
		});
		expect(mockAuthenticationAuditService.create).toHaveBeenCalledWith({
			actorId: "user@example.com",
			event: "password-changed",
			data: {
				userIdentity: "did:user:123",
				organizationIdentity: "did:org:456"
			}
		});
	});

	it("should update the password without checking the current password when none is provided", async () => {
		await userEntityStorage.set({
			email: "user@example.com",
			password: "stored-password",
			salt: "AQIDBA==",
			identity: "did:user:123",
			organization: "did:org:456",
			scope: "read,write"
		});
		vi.spyOn(PasswordValidator, "validatePassword").mockImplementation(() => {});
		const comparePasswordHashesSpy = vi.spyOn(PasswordValidator, "comparePasswordHashes");
		vi.spyOn(RandomHelper, "generate").mockReturnValue(new Uint8Array([5, 6, 7, 8]));
		vi.spyOn(PasswordGenerator, "hashPassword").mockResolvedValue("new-password-hash");

		await service.updatePassword("user@example.com", "better-password-value");

		expect(comparePasswordHashesSpy).not.toHaveBeenCalled();
		expect(await userEntityStorage.get("user@example.com")).toEqual({
			email: "user@example.com",
			salt: "BQYHCA==",
			password: "new-password-hash",
			identity: "did:user:123",
			organization: "did:org:456",
			scope: "read,write",
			passwordVersion: 1
		});
	});

	it("should wrap updatePassword failures when the current password does not match", async () => {
		await userEntityStorage.set({
			email: "user@example.com",
			password: "stored-password",
			salt: "AQIDBA==",
			identity: "did:user:123",
			organization: "did:org:456",
			scope: "read,write"
		});
		vi.spyOn(PasswordValidator, "validatePassword").mockImplementation(() => {});
		vi.spyOn(PasswordGenerator, "hashPassword").mockResolvedValue("current-password-hash");
		vi.spyOn(PasswordValidator, "comparePasswordHashes").mockReturnValue(false);

		await expect(
			service.updatePassword("user@example.com", "better-password-value", "wrong-current-password")
		).rejects.toThrow(GeneralError);
		expect(await userEntityStorage.get("user@example.com")).toMatchObject({
			password: "stored-password"
		});
	});

	it("should wrap updatePassword failures when the user is missing", async () => {
		vi.spyOn(PasswordValidator, "validatePassword").mockImplementation(() => {});

		await expect(
			service.updatePassword("missing@example.com", "better-password-value")
		).rejects.toThrow(GeneralError);
		expect(await userEntityStorage.get("missing@example.com")).toBeUndefined();
	});

	it("should wrap updatePassword failures when new password validation fails", async () => {
		vi.spyOn(PasswordValidator, "validatePassword").mockImplementation(() => {
			throw new Error("password too short");
		});
		const setSpy = vi.spyOn(userEntityStorage, "set");

		await expect(service.updatePassword("user@example.com", "short")).rejects.toThrow(GeneralError);
		expect(setSpy).not.toHaveBeenCalled();
	});

	describe("with tenant partitioning", () => {
		const TENANT_A = "tenant-a";
		const TENANT_B = "tenant-b";

		beforeEach(() => {
			userEntityStorage = new MemoryEntityStorageConnector<AuthenticationUser>({
				entitySchema: nameof<AuthenticationUser>(),
				partitionContextIds: [ContextIdKeys.Tenant],
				config: { storageKey: "authentication-user-tenant" }
			});

			vi.spyOn(EntityStorageConnectorFactory, "get").mockReturnValue(userEntityStorage);

			service = new EntityStorageAuthenticationAdminService({
				config: {
					minPasswordLength: 10
				}
			});
		});

		it("should create and retrieve a user within a tenant", async () => {
			vi.spyOn(PasswordValidator, "validatePassword").mockImplementation(() => {});
			vi.spyOn(RandomHelper, "generate").mockReturnValue(new Uint8Array([1, 2, 3, 4]));
			vi.spyOn(PasswordGenerator, "hashPassword").mockResolvedValue("hashed-password");

			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_A }, async () => {
				await service.create({
					email: "user@example.com",
					password: "correct-horse-battery",
					userIdentity: "did:user:123",
					organizationIdentity: "did:org:456",
					scope: ["read"]
				});

				expect(await userEntityStorage.get("user@example.com")).toEqual({
					email: "user@example.com",
					salt: "AQIDBA==",
					password: "hashed-password",
					identity: "did:user:123",
					organization: "did:org:456",
					scope: "read",
					passwordVersion: 0
				});
			});
		});

		it("should get a user by email within a tenant", async () => {
			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_A }, async () => {
				await userEntityStorage.set({
					email: "user@example.com",
					password: "stored-password",
					salt: "AQIDBA==",
					identity: "did:user:123",
					organization: "did:org:456",
					scope: "read,write"
				});

				const result = await service.get("user@example.com");

				expect(result).toEqual({
					email: "user@example.com",
					userIdentity: "did:user:123",
					organizationIdentity: "did:org:456",
					scope: ["read", "write"]
				});
			});
		});

		it("should get a user by identity within a tenant", async () => {
			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_A }, async () => {
				await userEntityStorage.set({
					email: "user@example.com",
					password: "stored-password",
					salt: "AQIDBA==",
					identity: "did:user:123",
					organization: "did:org:456",
					scope: "read,write"
				});

				const result = await service.getByIdentity("did:user:123");

				expect(result).toEqual({
					email: "user@example.com",
					userIdentity: "did:user:123",
					organizationIdentity: "did:org:456",
					scope: ["read", "write"]
				});
			});
		});

		it("should update a user within a tenant", async () => {
			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_A }, async () => {
				await userEntityStorage.set({
					email: "user@example.com",
					password: "stored-password",
					salt: "AQIDBA==",
					identity: "did:user:123",
					organization: "did:org:456",
					scope: "read"
				});

				await service.update({
					email: "user@example.com",
					organizationIdentity: "did:org:999",
					scope: ["admin"]
				});

				expect(await userEntityStorage.get("user@example.com")).toMatchObject({
					organization: "did:org:999",
					scope: "admin"
				});
			});
		});

		it("should remove a user within a tenant", async () => {
			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_A }, async () => {
				await userEntityStorage.set({
					email: "user@example.com",
					password: "stored-password",
					salt: "AQIDBA==",
					identity: "did:user:123",
					organization: "did:org:456",
					scope: "read"
				});

				await service.remove("user@example.com");

				expect(await userEntityStorage.get("user@example.com")).toBeUndefined();
			});
		});

		it("should update the password within a tenant", async () => {
			vi.spyOn(PasswordValidator, "validatePassword").mockImplementation(() => {});
			vi.spyOn(RandomHelper, "generate").mockReturnValue(new Uint8Array([5, 6, 7, 8]));
			vi.spyOn(PasswordGenerator, "hashPassword").mockResolvedValue("new-password-hash");

			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_A }, async () => {
				await userEntityStorage.set({
					email: "user@example.com",
					password: "stored-password",
					salt: "AQIDBA==",
					identity: "did:user:123",
					organization: "did:org:456",
					scope: "read,write"
				});

				await service.updatePassword("user@example.com", "better-password-value");

				expect(await userEntityStorage.get("user@example.com")).toMatchObject({
					password: "new-password-hash"
				});
			});
		});

		it("should allow the same email to be created in different tenants", async () => {
			vi.spyOn(PasswordValidator, "validatePassword").mockImplementation(() => {});
			vi.spyOn(RandomHelper, "generate").mockReturnValue(new Uint8Array([1, 2, 3, 4]));
			vi.spyOn(PasswordGenerator, "hashPassword")
				.mockResolvedValueOnce("hashed-password-a")
				.mockResolvedValueOnce("hashed-password-b");

			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_A }, async () => {
				await service.create({
					email: "user@example.com",
					password: "correct-horse-battery",
					userIdentity: "did:user:tenant-a",
					organizationIdentity: "did:org:456",
					scope: ["read"]
				});
			});

			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_B }, async () => {
				await service.create({
					email: "user@example.com",
					password: "correct-horse-battery",
					userIdentity: "did:user:tenant-b",
					organizationIdentity: "did:org:456",
					scope: ["write"]
				});
			});

			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_A }, async () => {
				const userA = await service.get("user@example.com");
				expect(userA).toMatchObject({ userIdentity: "did:user:tenant-a", scope: ["read"] });
			});

			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_B }, async () => {
				const userB = await service.get("user@example.com");
				expect(userB).toMatchObject({ userIdentity: "did:user:tenant-b", scope: ["write"] });
			});
		});

		it("should isolate users between tenants", async () => {
			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_A }, async () => {
				await userEntityStorage.set({
					email: "user@example.com",
					password: "stored-password",
					salt: "AQIDBA==",
					identity: "did:user:123",
					organization: "did:org:456",
					scope: "read"
				});
			});

			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_B }, async () => {
				await expect(service.get("user@example.com")).rejects.toThrow(GeneralError);
			});
		});

		it("should not find a user by identity from a different tenant", async () => {
			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_A }, async () => {
				await userEntityStorage.set({
					email: "user@example.com",
					password: "stored-password",
					salt: "AQIDBA==",
					identity: "did:user:123",
					organization: "did:org:456",
					scope: "read"
				});
			});

			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_B }, async () => {
				await expect(service.getByIdentity("did:user:123")).rejects.toThrow(GeneralError);
			});
		});

		it("should not update a user from a different tenant", async () => {
			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_A }, async () => {
				await userEntityStorage.set({
					email: "user@example.com",
					password: "stored-password",
					salt: "AQIDBA==",
					identity: "did:user:123",
					organization: "did:org:456",
					scope: "read"
				});
			});

			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_B }, async () => {
				await expect(
					service.update({ email: "user@example.com", organizationIdentity: "did:org:999" })
				).rejects.toThrow(GeneralError);
			});

			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_A }, async () => {
				expect(await userEntityStorage.get("user@example.com")).toMatchObject({
					organization: "did:org:456"
				});
			});
		});

		it("should not remove a user from a different tenant", async () => {
			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_A }, async () => {
				await userEntityStorage.set({
					email: "user@example.com",
					password: "stored-password",
					salt: "AQIDBA==",
					identity: "did:user:123",
					organization: "did:org:456",
					scope: "read"
				});
			});

			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_B }, async () => {
				await expect(service.remove("user@example.com")).rejects.toThrow(GeneralError);
			});

			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_A }, async () => {
				expect(await userEntityStorage.get("user@example.com")).toBeDefined();
			});
		});

		it("should not update the password for a user from a different tenant", async () => {
			vi.spyOn(PasswordValidator, "validatePassword").mockImplementation(() => {});

			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_A }, async () => {
				await userEntityStorage.set({
					email: "user@example.com",
					password: "stored-password",
					salt: "AQIDBA==",
					identity: "did:user:123",
					organization: "did:org:456",
					scope: "read"
				});
			});

			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_B }, async () => {
				await expect(
					service.updatePassword("user@example.com", "better-password-value")
				).rejects.toThrow(GeneralError);
			});

			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_A }, async () => {
				expect(await userEntityStorage.get("user@example.com")).toMatchObject({
					password: "stored-password"
				});
			});
		});
	});
});
