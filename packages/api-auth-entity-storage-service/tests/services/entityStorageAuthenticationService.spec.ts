// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type {
	IAuthenticationAuditComponent,
	IAuthenticationRateComponent
} from "@twin.org/api-auth-models";
import { TooManyRequestsError } from "@twin.org/api-models";
import { ContextIdKeys, ContextIdStore } from "@twin.org/context";
import { ComponentFactory, NotFoundError, UnauthorizedError } from "@twin.org/core";
import { PasswordGenerator, PasswordValidator } from "@twin.org/crypto";
import { MemoryEntityStorageConnector } from "@twin.org/entity-storage-connector-memory";
import {
	EntityStorageConnectorFactory,
	type IEntityStorageConnector
} from "@twin.org/entity-storage-models";
import { nameof } from "@twin.org/nameof";
import { VaultConnectorFactory, type IVaultConnector } from "@twin.org/vault-models";
import type { AuthenticationUser } from "../../src/entities/authenticationUser.js";
import { initSchema } from "../../src/schema.js";
import { EntityStorageAuthenticationService } from "../../src/services/entityStorageAuthenticationService.js";
import { PasswordHelper } from "../../src/utils/passwordHelper.js";
import { TokenHelper } from "../../src/utils/tokenHelper.js";

initSchema();

describe("EntityStorageAuthenticationService", () => {
	let mockAuthenticationAuditService: IAuthenticationAuditComponent;
	let mockAuthenticationRateService: IAuthenticationRateComponent;
	let mockUserEntityStorage: IEntityStorageConnector;
	let mockVaultConnector: IVaultConnector;
	let service: EntityStorageAuthenticationService;

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

		mockAuthenticationRateService = {
			className: vi.fn().mockReturnValue("AuthenticationRateService"),
			start: vi.fn(),
			stop: vi.fn(),
			registerAction: vi.fn(),
			unregisterAction: vi.fn(),
			check: vi.fn(),
			clear: vi.fn()
		};

		mockUserEntityStorage = {
			get: vi.fn(),
			set: vi.fn(),
			remove: vi.fn()
		} as unknown as IEntityStorageConnector;

		mockVaultConnector = {
			get: vi.fn(),
			set: vi.fn(),
			remove: vi.fn()
		} as unknown as IVaultConnector;

		vi.spyOn(EntityStorageConnectorFactory, "get").mockReturnValue(mockUserEntityStorage);
		vi.spyOn(VaultConnectorFactory, "get").mockReturnValue(mockVaultConnector);
		vi.spyOn(ComponentFactory, "get").mockImplementation(componentName => {
			if (componentName === "authentication-rate") {
				return mockAuthenticationRateService;
			}

			throw new Error(`Unexpected component ${componentName}`);
		});
		vi.spyOn(ComponentFactory, "getIfExists").mockImplementation(componentName => {
			if (componentName === "authentication-audit") {
				return mockAuthenticationAuditService;
			}

			return undefined;
		});

		service = new EntityStorageAuthenticationService();
	});

	it("should return the class name", () => {
		expect(service.className()).toBe(EntityStorageAuthenticationService.CLASS_NAME);
	});

	it("should login and create a token for a valid user", async () => {
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.Node]: "node-1",
			[ContextIdKeys.Tenant]: "tenant-1"
		});
		vi.mocked(mockUserEntityStorage.get).mockResolvedValue({
			email: "user@example.com",
			identity: "did:user:123",
			organization: "did:org:456",
			password: "stored-password-hash",
			salt: "c2FsdA=="
		});
		vi.spyOn(PasswordGenerator, "hashPassword").mockResolvedValue("generated-password-hash");
		vi.spyOn(PasswordValidator, "comparePasswordHashes").mockReturnValue(true);
		vi.spyOn(TokenHelper, "createToken").mockResolvedValue({
			token: "jwt-token",
			expiry: 123456789
		});

		await service.start();
		const result = await service.login("user@example.com", "correct-password");

		expect(result).toEqual({ token: "jwt-token", expiry: 123456789 });
		expect(mockUserEntityStorage.get).toHaveBeenCalledWith("user@example.com");
		expect(TokenHelper.createToken).toHaveBeenCalledWith(
			mockVaultConnector,
			"node-1",
			"auth-signing",
			"did:user:123",
			"did:org:456",
			"tenant-1",
			60,
			0
		);
		expect(mockAuthenticationRateService.clear).toHaveBeenCalledWith("login", "user@example.com");
		expect(mockAuthenticationAuditService.create).toHaveBeenCalledWith({
			actorId: "user@example.com",
			event: "login-success",
			data: {
				userIdentity: "did:user:123",
				organizationIdentity: "did:org:456",
				tenantId: "tenant-1"
			}
		});
	});

	it("should throw UnauthorizedError when login password does not match", async () => {
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.Node]: "node-1"
		});
		vi.mocked(mockUserEntityStorage.get).mockResolvedValue({
			email: "user@example.com",
			identity: "did:user:123",
			organization: "did:org:456",
			password: "stored-password-hash",
			salt: "c2FsdA=="
		});
		vi.spyOn(PasswordGenerator, "hashPassword").mockResolvedValue("generated-password-hash");
		vi.spyOn(PasswordValidator, "comparePasswordHashes").mockReturnValue(false);

		await service.start();

		await expect(service.login("user@example.com", "wrong-password")).rejects.toThrow(
			UnauthorizedError
		);
		expect(mockAuthenticationAuditService.create).toHaveBeenCalledWith({
			actorId: "user@example.com",
			event: "login-failure"
		});
	});

	it("should throw UnauthorizedError when login user does not exist", async () => {
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.Node]: "node-1"
		});
		vi.mocked(mockUserEntityStorage.get).mockResolvedValue(undefined);
		const createTokenSpy = vi.spyOn(TokenHelper, "createToken");

		await service.start();

		await expect(service.login("missing@example.com", "password")).rejects.toThrow(
			UnauthorizedError
		);
		expect(createTokenSpy).not.toHaveBeenCalled();
	});

	it("should throw UnauthorizedError when token creation fails during login", async () => {
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.Node]: "node-1"
		});
		vi.mocked(mockUserEntityStorage.get).mockResolvedValue({
			email: "user@example.com",
			identity: "did:user:123",
			organization: "did:org:456",
			password: "stored-password-hash",
			salt: "c2FsdA=="
		});
		vi.spyOn(PasswordGenerator, "hashPassword").mockResolvedValue("generated-password-hash");
		vi.spyOn(PasswordValidator, "comparePasswordHashes").mockReturnValue(true);
		vi.spyOn(TokenHelper, "createToken").mockRejectedValue(new Error("token generation failed"));

		await service.start();

		await expect(service.login("user@example.com", "correct-password")).rejects.toThrow(
			UnauthorizedError
		);
	});

	it("should register login rate action on start using defaults", async () => {
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.Node]: "node-1"
		});

		await service.start();

		expect(mockAuthenticationRateService.registerAction).toHaveBeenCalledWith("login", {
			maxAttempts: 5,
			windowMinutes: 15
		});
		expect(mockAuthenticationRateService.registerAction).toHaveBeenCalledWith("password-change", {
			maxAttempts: 5,
			windowMinutes: 15
		});
		expect(mockAuthenticationRateService.registerAction).toHaveBeenCalledWith("token-refresh", {
			maxAttempts: 30,
			windowMinutes: 60
		});
	});

	it("should register login rate action on start when configured", async () => {
		service = new EntityStorageAuthenticationService({
			config: {
				loginRateLimit: {
					maxAttempts: 5,
					windowMinutes: 10
				}
			}
		});
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.Node]: "node-1"
		});

		await service.start();

		expect(mockAuthenticationRateService.registerAction).toHaveBeenCalledWith("login", {
			maxAttempts: 5,
			windowMinutes: 10
		});
	});

	it("should unregister login rate action on stop", async () => {
		await service.stop();

		expect(mockAuthenticationRateService.unregisterAction).toHaveBeenCalledWith("login");
		expect(mockAuthenticationRateService.unregisterAction).toHaveBeenCalledWith("password-change");
		expect(mockAuthenticationRateService.unregisterAction).toHaveBeenCalledWith("token-refresh");
	});

	it("should wrap rate limit check failures during login", async () => {
		service = new EntityStorageAuthenticationService({
			config: {
				loginRateLimit: {
					maxAttempts: 2,
					windowMinutes: 15
				}
			}
		});
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.Node]: "node-1"
		});
		vi.mocked(mockUserEntityStorage.get).mockResolvedValue({
			email: "user@example.com",
			identity: "did:user:123",
			organization: "did:org:456",
			password: "stored-password-hash",
			salt: "c2FsdA=="
		});
		vi.spyOn(PasswordGenerator, "hashPassword").mockResolvedValue("generated-password-hash");
		vi.spyOn(PasswordValidator, "comparePasswordHashes").mockReturnValue(false);
		vi.mocked(mockAuthenticationRateService.check).mockRejectedValue(
			new TooManyRequestsError(
				"EntityStorageAuthenticationRateService",
				"rateLimitExceeded",
				2,
				"2026-04-13T10:10:00.000Z"
			)
		);

		await service.start();
		const loginAttempt = service.login("user@example.com", "wrong-password");

		await expect(loginAttempt).rejects.toThrow(UnauthorizedError);
		await expect(loginAttempt).rejects.toMatchObject({
			cause: {
				name: TooManyRequestsError.name
			}
		});
		expect(mockAuthenticationRateService.check).toHaveBeenCalledWith("login", "user@example.com");
		expect(mockAuthenticationRateService.clear).not.toHaveBeenCalled();
	});

	it("should refresh a token after verifyUser confirms the stored user", async () => {
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.Node]: "node-1"
		});
		vi.mocked(mockUserEntityStorage.get).mockResolvedValue({
			email: "user@example.com",
			identity: "did:user:123",
			organization: "did:org:456",
			password: "stored-password-hash",
			salt: "c2FsdA=="
		});
		vi.spyOn(TokenHelper, "verify").mockImplementation(
			async (vaultConnector, nodeId, signingKeyName, token, verifyUser) => {
				const verified = await verifyUser?.("did:user:123", "did:org:456", undefined, 0);
				expect(verified).toEqual(["user", "organization"]);
				return {
					header: { alg: "EdDSA" },
					payload: {
						sub: "did:user:123",
						org: "did:org:456"
					}
				};
			}
		);
		vi.spyOn(TokenHelper, "createToken").mockResolvedValue({
			token: "refreshed-token",
			expiry: 987654321
		});

		await service.start();
		const result = await service.refresh("existing-token");

		expect(result).toEqual({ token: "refreshed-token", expiry: 987654321 });
		expect(mockUserEntityStorage.get).toHaveBeenCalledWith("did:user:123", "identity");
		expect(TokenHelper.createToken).toHaveBeenCalledWith(
			mockVaultConnector,
			"node-1",
			"auth-signing",
			"did:user:123",
			"did:org:456",
			undefined,
			60,
			0
		);
		expect(mockAuthenticationRateService.check).toHaveBeenCalledWith(
			"token-refresh",
			"did:user:123"
		);
		expect(mockAuthenticationRateService.clear).not.toHaveBeenCalled();
		expect(mockAuthenticationAuditService.create).toHaveBeenCalledWith({
			actorId: "did:user:123",
			event: "token-refreshed",
			data: {
				organizationIdentity: "did:org:456",
				tenantId: undefined,
				version: 0
			}
		});
	});

	it("should throw TooManyRequestsError when token refresh rate limit is exceeded", async () => {
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.Node]: "node-1"
		});
		vi.spyOn(TokenHelper, "verify").mockImplementation(
			async (vaultConnector, nodeId, signingKeyName, token, verifyUser) => {
				await verifyUser?.("did:user:123", "did:org:456", undefined, undefined);
				return {
					header: { alg: "EdDSA" },
					payload: {
						sub: "did:user:123",
						org: "did:org:456",
						tid: "tenant-1"
					}
				};
			}
		);
		vi.mocked(mockAuthenticationRateService.check).mockRejectedValue(
			new TooManyRequestsError(
				"EntityStorageAuthenticationRateService",
				"rateLimitExceeded",
				5,
				"2026-04-13T10:10:00.000Z"
			)
		);
		const createTokenSpy = vi.spyOn(TokenHelper, "createToken");

		await service.start();

		await expect(service.refresh("existing-token")).rejects.toThrow(TooManyRequestsError);
		expect(createTokenSpy).not.toHaveBeenCalled();
		expect(mockAuthenticationRateService.clear).not.toHaveBeenCalled();
	});

	it("should throw UnauthorizedError when refresh verification fails", async () => {
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.Node]: "node-1"
		});
		vi.spyOn(TokenHelper, "verify").mockRejectedValue(
			new UnauthorizedError(EntityStorageAuthenticationService.CLASS_NAME, "refreshFailed")
		);
		const createTokenSpy = vi.spyOn(TokenHelper, "createToken");

		await service.start();

		await expect(service.refresh("invalid-token")).rejects.toThrow(UnauthorizedError);
		expect(createTokenSpy).not.toHaveBeenCalled();
	});

	it("should throw UnauthorizedError when refresh verifyUser callback cannot confirm the user", async () => {
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.Node]: "node-1"
		});
		vi.mocked(mockUserEntityStorage.get).mockResolvedValue({
			email: "user@example.com",
			identity: "did:user:other",
			organization: "did:org:456",
			password: "stored-password-hash",
			salt: "c2FsdA=="
		});
		const createTokenSpy = vi.spyOn(TokenHelper, "createToken");
		vi.spyOn(TokenHelper, "verify").mockImplementation(
			async (vaultConnector, nodeId, signingKeyName, token, verifyUser) => {
				const verified = await verifyUser?.("did:user:123", "did:org:456", undefined, 0);
				if (!verified?.includes("user")) {
					throw new UnauthorizedError(TokenHelper.CLASS_NAME, "userNotVerified");
				}

				return {
					header: { alg: "EdDSA" },
					payload: {
						sub: "did:user:123",
						org: "did:org:456"
					}
				};
			}
		);

		await service.start();

		await expect(service.refresh("existing-token")).rejects.toThrow(UnauthorizedError);
		expect(mockUserEntityStorage.get).toHaveBeenCalledWith("did:user:123", "identity");
		expect(createTokenSpy).not.toHaveBeenCalled();
	});

	it("should throw UnauthorizedError when refresh verifyUser callback cannot confirm the organization", async () => {
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.Node]: "node-1"
		});
		vi.mocked(mockUserEntityStorage.get).mockResolvedValue({
			email: "user@example.com",
			identity: "did:user:123",
			organization: "did:org:other",
			password: "stored-password-hash",
			salt: "c2FsdA=="
		});
		const createTokenSpy = vi.spyOn(TokenHelper, "createToken");
		vi.spyOn(TokenHelper, "verify").mockImplementation(
			async (vaultConnector, nodeId, signingKeyName, token, verifyUser) => {
				const verified = await verifyUser?.("did:user:123", "did:org:456", undefined, 0);
				if (!verified?.includes("organization")) {
					throw new UnauthorizedError(TokenHelper.CLASS_NAME, "organizationNotVerified");
				}

				return {
					header: { alg: "EdDSA" },
					payload: {
						sub: "did:user:123",
						org: "did:org:456"
					}
				};
			}
		);

		await service.start();

		await expect(service.refresh("existing-token")).rejects.toThrow(UnauthorizedError);
		expect(mockUserEntityStorage.get).toHaveBeenCalledWith("did:user:123", "identity");
		expect(createTokenSpy).not.toHaveBeenCalled();
	});

	it("should throw UnauthorizedError when refresh token passwordVersion is stale after a password change", async () => {
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.Node]: "node-1"
		});
		vi.mocked(mockUserEntityStorage.get).mockResolvedValue({
			email: "user@example.com",
			identity: "did:user:123",
			organization: "did:org:456",
			password: "stored-password-hash",
			salt: "c2FsdA==",
			passwordVersion: 2
		});
		const createTokenSpy = vi.spyOn(TokenHelper, "createToken");
		vi.spyOn(TokenHelper, "verify").mockImplementation(
			async (vaultConnector, nodeId, signingKeyName, token, verifyUser) => {
				// pver=1 in token but user has passwordVersion=2 - simulate stale token
				const verified = await verifyUser?.("did:user:123", "did:org:456", undefined, 1);
				if (!verified?.includes("user")) {
					throw new UnauthorizedError(TokenHelper.CLASS_NAME, "userNotVerified");
				}
				return {
					header: { alg: "EdDSA" },
					payload: { sub: "did:user:123", org: "did:org:456" }
				};
			}
		);

		await service.start();

		await expect(service.refresh("existing-token")).rejects.toThrow(UnauthorizedError);
		expect(mockUserEntityStorage.get).toHaveBeenCalledWith("did:user:123", "identity");
		expect(createTokenSpy).not.toHaveBeenCalled();
	});

	it("should update the password for the current user", async () => {
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.User]: "did:user:123"
		});
		vi.mocked(mockUserEntityStorage.get).mockResolvedValue({
			email: "user@example.com",
			identity: "did:user:123",
			organization: "did:org:456",
			password: "stored-password-hash",
			salt: "c2FsdA=="
		});
		vi.spyOn(PasswordHelper, "updatePassword").mockResolvedValue(undefined);

		await service.updatePassword("current-password", "new-password");

		expect(mockAuthenticationRateService.check).toHaveBeenCalledWith(
			"password-change",
			"did:user:123"
		);
		expect(mockUserEntityStorage.get).toHaveBeenCalledWith("did:user:123", "identity");
		expect(PasswordHelper.updatePassword).toHaveBeenCalledWith(
			mockUserEntityStorage,
			mockAuthenticationAuditService,
			expect.objectContaining({ email: "user@example.com", identity: "did:user:123" }),
			"new-password",
			"current-password",
			{ minPasswordLength: undefined, maxPasswordLength: undefined }
		);
		expect(mockAuthenticationRateService.clear).toHaveBeenCalledWith(
			"password-change",
			"did:user:123"
		);
	});

	it("should throw TooManyRequestsError when password change rate limit is exceeded", async () => {
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.User]: "did:user:123"
		});
		vi.mocked(mockAuthenticationRateService.check).mockRejectedValue(
			new TooManyRequestsError(
				"EntityStorageAuthenticationRateService",
				"rateLimitExceeded",
				2,
				"2026-04-13T10:10:00.000Z"
			)
		);

		await expect(service.updatePassword("current-password", "new-password")).rejects.toThrow(
			TooManyRequestsError
		);
		expect(mockUserEntityStorage.get).not.toHaveBeenCalled();
		expect(mockAuthenticationRateService.clear).not.toHaveBeenCalled();
	});

	it("should throw NotFoundError when updating the password for an unknown user", async () => {
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.User]: "did:user:missing"
		});
		vi.mocked(mockUserEntityStorage.get).mockResolvedValue(undefined);

		await expect(service.updatePassword("current-password", "new-password")).rejects.toThrow(
			NotFoundError
		);
		expect(mockAuthenticationRateService.clear).not.toHaveBeenCalled();
	});

	it("should logout without throwing", async () => {
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.User]: "did:user:123"
		});

		await expect(service.logout("token")).resolves.toBeUndefined();
		expect(mockAuthenticationAuditService.create).toHaveBeenCalledWith({
			actorId: "did:user:123",
			event: "logout"
		});
	});

	describe("with tenant partitioning", () => {
		const TENANT_A = "tenant-a";
		const TENANT_B = "tenant-b";
		let userEntityStorage: MemoryEntityStorageConnector<AuthenticationUser>;

		beforeEach(async () => {
			userEntityStorage = new MemoryEntityStorageConnector<AuthenticationUser>({
				entitySchema: nameof<AuthenticationUser>(),
				partitionContextIds: [ContextIdKeys.Tenant],
				config: { storageKey: "authentication-user-tenant-2" }
			});

			vi.spyOn(EntityStorageConnectorFactory, "get").mockReturnValue(userEntityStorage);

			service = new EntityStorageAuthenticationService();

			await ContextIdStore.run({ [ContextIdKeys.Node]: "node-1" }, async () => {
				await service.start();
			});
		});

		it("should login a user within a tenant", async () => {
			vi.spyOn(PasswordGenerator, "hashPassword").mockResolvedValue("generated-password-hash");
			vi.spyOn(PasswordValidator, "comparePasswordHashes").mockReturnValue(true);
			vi.spyOn(TokenHelper, "createToken").mockResolvedValue({
				token: "jwt-token",
				expiry: 123456789
			});

			await ContextIdStore.run(
				{ [ContextIdKeys.Node]: "node-1", [ContextIdKeys.Tenant]: TENANT_A },
				async () => {
					await userEntityStorage.set({
						email: "user@example.com",
						identity: "did:user:123",
						organization: "did:org:456",
						password: "stored-password-hash",
						salt: "c2FsdA=="
					});

					const result = await service.login("user@example.com", "correct-password");
					expect(result).toEqual({ token: "jwt-token", expiry: 123456789 });
				}
			);
		});

		it("should fail to login a user from a different tenant", async () => {
			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_A }, async () => {
				await userEntityStorage.set({
					email: "user@example.com",
					identity: "did:user:123",
					organization: "did:org:456",
					password: "stored-password-hash",
					salt: "c2FsdA=="
				});
			});

			await ContextIdStore.run(
				{ [ContextIdKeys.Node]: "node-1", [ContextIdKeys.Tenant]: TENANT_B },
				async () => {
					await expect(service.login("user@example.com", "correct-password")).rejects.toThrow(
						UnauthorizedError
					);
				}
			);
		});

		it("should allow the same email to log in from different tenants independently", async () => {
			vi.spyOn(PasswordGenerator, "hashPassword").mockResolvedValue("generated-password-hash");
			vi.spyOn(PasswordValidator, "comparePasswordHashes").mockReturnValue(true);
			vi.spyOn(TokenHelper, "createToken")
				.mockResolvedValueOnce({ token: "token-a", expiry: 111 })
				.mockResolvedValueOnce({ token: "token-b", expiry: 222 });

			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_A }, async () => {
				await userEntityStorage.set({
					email: "user@example.com",
					identity: "did:user:tenant-a",
					organization: "did:org:456",
					password: "stored-password-hash",
					salt: "c2FsdA=="
				});
			});

			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_B }, async () => {
				await userEntityStorage.set({
					email: "user@example.com",
					identity: "did:user:tenant-b",
					organization: "did:org:456",
					password: "stored-password-hash",
					salt: "c2FsdA=="
				});
			});

			let resultA: { token?: string; expiry: number } | undefined;
			await ContextIdStore.run(
				{ [ContextIdKeys.Node]: "node-1", [ContextIdKeys.Tenant]: TENANT_A },
				async () => {
					resultA = await service.login("user@example.com", "correct-password");
				}
			);

			let resultB: { token?: string; expiry: number } | undefined;
			await ContextIdStore.run(
				{ [ContextIdKeys.Node]: "node-1", [ContextIdKeys.Tenant]: TENANT_B },
				async () => {
					resultB = await service.login("user@example.com", "correct-password");
				}
			);

			expect(resultA?.token).toBe("token-a");
			expect(resultB?.token).toBe("token-b");
		});

		it("should update the password within a tenant", async () => {
			vi.spyOn(PasswordHelper, "updatePassword").mockResolvedValue(undefined);

			await ContextIdStore.run(
				{ [ContextIdKeys.Tenant]: TENANT_A, [ContextIdKeys.User]: "did:user:123" },
				async () => {
					await userEntityStorage.set({
						email: "user@example.com",
						identity: "did:user:123",
						organization: "did:org:456",
						password: "stored-password-hash",
						salt: "c2FsdA=="
					});

					await service.updatePassword("current-password", "new-password");

					expect(PasswordHelper.updatePassword).toHaveBeenCalledWith(
						userEntityStorage,
						mockAuthenticationAuditService,
						expect.objectContaining({ email: "user@example.com", identity: "did:user:123" }),
						"new-password",
						"current-password",
						{ minPasswordLength: undefined, maxPasswordLength: undefined }
					);
				}
			);
		});

		it("should fail to update the password for a user in a different tenant", async () => {
			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_A }, async () => {
				await userEntityStorage.set({
					email: "user@example.com",
					identity: "did:user:123",
					organization: "did:org:456",
					password: "stored-password-hash",
					salt: "c2FsdA=="
				});
			});

			await ContextIdStore.run(
				{ [ContextIdKeys.Tenant]: TENANT_B, [ContextIdKeys.User]: "did:user:123" },
				async () => {
					await expect(service.updatePassword("current-password", "new-password")).rejects.toThrow(
						NotFoundError
					);
				}
			);
		});

		it("should fail to refresh a token when the user is in a different tenant", async () => {
			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_A }, async () => {
				await userEntityStorage.set({
					email: "user@example.com",
					identity: "did:user:123",
					organization: "did:org:456",
					password: "stored-password-hash",
					salt: "c2FsdA=="
				});
			});

			vi.spyOn(TokenHelper, "verify").mockImplementation(
				async (vaultConnector, nodeId, signingKeyName, token, verifyUser) => {
					const verified = await verifyUser?.("did:user:123", "did:org:456", undefined, 0);
					if (!verified?.includes("user")) {
						throw new UnauthorizedError(TokenHelper.CLASS_NAME, "userNotVerified");
					}
					return {
						header: { alg: "EdDSA" },
						payload: { sub: "did:user:123", org: "did:org:456", tid: TENANT_B }
					};
				}
			);

			await ContextIdStore.run(
				{ [ContextIdKeys.Node]: "node-1", [ContextIdKeys.Tenant]: TENANT_B },
				async () => {
					await expect(service.refresh("existing-token")).rejects.toThrow(UnauthorizedError);
				}
			);
		});
	});

	it("should throw UnauthorizedError when token carries a tenant ID but tenantAdminComponent is not configured", async () => {
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.Node]: "node-1"
		});
		vi.mocked(mockUserEntityStorage.get).mockResolvedValue({
			email: "user@example.com",
			identity: "did:user:123",
			organization: "did:org:456",
			password: "stored-password-hash",
			salt: "c2FsdA=="
		});
		vi.spyOn(TokenHelper, "verify").mockImplementation(
			async (vaultConnector, nodeId, signingKeyName, token, verifyUser) => {
				const verified = await verifyUser?.("did:user:123", "did:org:456", "tenant-a", 0);
				if (!verified?.includes("tenant")) {
					throw new UnauthorizedError(TokenHelper.CLASS_NAME, "tenantNotVerified");
				}
				return {
					header: { alg: "EdDSA" },
					payload: {
						sub: "did:user:123",
						org: "did:org:456",
						tid: "tenant-a"
					}
				};
			}
		);

		await service.start();

		await expect(service.refresh("existing-token")).rejects.toThrow(UnauthorizedError);
	});

	it("should throw UnauthorizedError when tenantAdminComponent is present but tenant is not found during refresh", async () => {
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.Node]: "node-1"
		});
		vi.mocked(mockUserEntityStorage.get).mockResolvedValue({
			email: "user@example.com",
			identity: "did:user:123",
			organization: "did:org:456",
			password: "stored-password-hash",
			salt: "c2FsdA=="
		});

		// Provide a tenantAdminComponent that can't find the tenant.
		const mockTenantAdminComponent = {
			className: vi.fn(),
			get: vi.fn().mockResolvedValue(undefined)
		};
		vi.spyOn(ComponentFactory, "getIfExists").mockImplementation(componentName => {
			if (componentName === "authentication-audit") {
				return mockAuthenticationAuditService;
			}
			if (componentName === "tenant-admin") {
				return mockTenantAdminComponent;
			}
			return undefined;
		});
		service = new EntityStorageAuthenticationService();

		vi.spyOn(TokenHelper, "verify").mockImplementation(
			async (vaultConnector, nodeId, signingKeyName, token, verifyUser) => {
				const verified = await verifyUser?.("did:user:123", "did:org:456", "tenant-a", 0);
				if (!verified?.includes("tenant")) {
					throw new UnauthorizedError(TokenHelper.CLASS_NAME, "tenantNotVerified");
				}
				return {
					header: { alg: "EdDSA" },
					payload: {
						sub: "did:user:123",
						org: "did:org:456",
						tid: "tenant-a"
					}
				};
			}
		);

		await service.start();

		await expect(service.refresh("existing-token")).rejects.toThrow(UnauthorizedError);
		expect(mockTenantAdminComponent.get).toHaveBeenCalledWith("tenant-a");
	});

	it("should refresh a token successfully when tenantAdminComponent is present and confirms the tenant", async () => {
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.Node]: "node-1"
		});
		vi.mocked(mockUserEntityStorage.get).mockResolvedValue({
			email: "user@example.com",
			identity: "did:user:123",
			organization: "did:org:456",
			password: "stored-password-hash",
			salt: "c2FsdA=="
		});

		const mockTenantAdminComponent = {
			className: vi.fn(),
			get: vi.fn().mockResolvedValue({ id: "tenant-a", publicOrigin: "https://a.example.com" })
		};
		vi.spyOn(ComponentFactory, "getIfExists").mockImplementation(componentName => {
			if (componentName === "authentication-audit") {
				return mockAuthenticationAuditService;
			}
			if (componentName === "tenant-admin") {
				return mockTenantAdminComponent;
			}
			return undefined;
		});
		service = new EntityStorageAuthenticationService();

		vi.spyOn(TokenHelper, "verify").mockImplementation(
			async (vaultConnector, nodeId, signingKeyName, token, verifyUser) => {
				const verified = await verifyUser?.("did:user:123", "did:org:456", "tenant-a", 0);
				expect(verified).toContain("tenant");
				return {
					header: { alg: "EdDSA" },
					payload: {
						sub: "did:user:123",
						org: "did:org:456",
						tid: "tenant-a"
					}
				};
			}
		);
		vi.spyOn(TokenHelper, "createToken").mockResolvedValue({
			token: "refreshed-token",
			expiry: 987654321
		});

		await service.start();
		const result = await service.refresh("existing-token");

		expect(result).toEqual({ token: "refreshed-token", expiry: 987654321 });
		expect(mockTenantAdminComponent.get).toHaveBeenCalledWith("tenant-a");
		expect(TokenHelper.createToken).toHaveBeenCalledWith(
			mockVaultConnector,
			"node-1",
			"auth-signing",
			"did:user:123",
			"did:org:456",
			"tenant-a",
			60,
			0
		);
	});
});
