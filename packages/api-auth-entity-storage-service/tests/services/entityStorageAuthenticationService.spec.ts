// Copyright 2026 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import {
	AuthenticationProviderFactory,
	type IAuthenticationAuditComponent,
	type IAuthenticationProvider,
	type IAuthenticationRateComponent
} from "@3sixty/api-auth-models";
import { TooManyRequestsError } from "@3sixty/api-models";
import { ContextIdKeys, ContextIdStore } from "@3sixty/context";
import { ComponentFactory, NotFoundError, RandomHelper, UnauthorizedError } from "@3sixty/core";
import { PasswordGenerator, PasswordValidator } from "@3sixty/crypto";
import { MemoryEntityStorageConnector } from "@3sixty/entity-storage-connector-memory";
import {
	EntityStorageConnectorFactory,
	type IEntityStorageConnector
} from "@3sixty/entity-storage-models";
import { nameof } from "@3sixty/nameof";
import { VaultConnectorFactory, type IVaultConnector } from "@3sixty/vault-models";
import type { AuthenticationUser } from "../../src/entities/authenticationUser.js";
import type { IEntityStorageAuthenticationServiceConfig } from "../../src/models/IEntityStorageAuthenticationServiceConfig.js";
import type { IEntityStorageAuthenticationServiceConstructorOptions } from "../../src/models/IEntityStorageAuthenticationServiceConstructorOptions.js";
import { initSchema } from "../../src/schema.js";
import { EntityStorageAuthenticationAdminService } from "../../src/services/entityStorageAuthenticationAdminService.js";
import { EntityStorageAuthenticationService } from "../../src/services/entityStorageAuthenticationService.js";
import { PasswordHelper } from "../../src/utils/passwordHelper.js";
import { TokenHelper } from "../../src/utils/tokenHelper.js";
import { registerTestPasswordProvider } from "../helpers/testPasswordProvider.js";

initSchema();
registerTestPasswordProvider();

/**
 * Create the service, with sign ups signed in at once unless a test turns verification on, as the
 * password provider is registered and these tests send no e-mail.
 * @param options The options for the service.
 * @returns The service.
 */
function createService(
	options?: Omit<IEntityStorageAuthenticationServiceConstructorOptions, "config"> & {
		config?: Partial<IEntityStorageAuthenticationServiceConfig>;
	}
): EntityStorageAuthenticationService {
	return new EntityStorageAuthenticationService({
		...options,
		config: {
			emailSender: "noreply@example.com",
			passwordResetUrl: "https://app.example.com/reset",
			registrationVerificationUrl: "https://app.example.com/verify",
			...options?.config
		}
	});
}

describe("EntityStorageAuthenticationService", () => {
	let mockAuthenticationAuditService: IAuthenticationAuditComponent;
	let mockAuthenticationRateService: IAuthenticationRateComponent;
	let mockUserEntityStorage: IEntityStorageConnector;
	let mockVaultConnector: IVaultConnector;
	let mockAuthorization: {
		className: () => string;
		addRoleForSubject: ReturnType<typeof vi.fn>;
		getRolesForSubject: ReturnType<typeof vi.fn>;
		removeAllRolesForSubject?: ReturnType<typeof vi.fn>;
	};
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
			remove: vi.fn(),
			query: vi.fn(async () => {
				const user = await mockUserEntityStorage.get("");
				return { entities: user ? [user] : [] };
			})
		} as unknown as IEntityStorageConnector;

		mockVaultConnector = {
			get: vi.fn(),
			set: vi.fn(),
			remove: vi.fn()
		} as unknown as IVaultConnector;

		vi.spyOn(EntityStorageConnectorFactory, "get").mockReturnValue(mockUserEntityStorage);
		vi.spyOn(VaultConnectorFactory, "get").mockReturnValue(mockVaultConnector);
		mockAuthorization = {
			className: () => "authorization",
			addRoleForSubject: vi.fn(),
			getRolesForSubject: vi.fn().mockResolvedValue(["user"]),
			removeAllRolesForSubject: vi.fn()
		};
		const requiredComponents: { [name: string]: unknown } = {
			"authentication-rate": mockAuthenticationRateService,
			"authentication-audit": mockAuthenticationAuditService,
			"authentication-account": { className: () => "account", removeIdentity: vi.fn() },
			"authentication-account-admin": {
				className: () => "accountAdmin",
				query: vi.fn().mockResolvedValue({ entities: [] }),
				create: vi.fn(),
				update: vi.fn()
			},
			"organization-request-admin": { className: () => "organizationRequestAdmin" },
			"task-scheduler": {
				className: () => "scheduler",
				addTask: vi.fn(),
				removeTask: vi.fn()
			},
			platform: {
				className: () => "platform",
				execute: vi.fn(async (method: () => Promise<void>) => method())
			},
			messaging: { className: () => "messaging", sendCustomEmail: vi.fn() }
		};
		vi.spyOn(ComponentFactory, "get").mockImplementation(componentName => {
			if (componentName === "authorization") {
				return mockAuthorization;
			}
			// A test replaces a component by returning it from getIfExists.
			const component =
				ComponentFactory.getIfExists(componentName) ?? requiredComponents[componentName];
			if (component === undefined) {
				throw new Error(`Unexpected component ${componentName}`);
			}
			return component as never;
		});
		vi.spyOn(ComponentFactory, "getIfExists").mockImplementation(componentName => {
			if (componentName === "authentication-audit") {
				return mockAuthenticationAuditService;
			}

			return undefined;
		});

		service = createService();
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
			accountId: "user-1",
			password: "stored-password-hash",
			salt: "c2FsdA==",
			authProviderId: "entity-storage",
			dateCreated: "2026-01-01T00:00:00.000Z",
			dateModified: "2026-01-01T00:00:00.000Z"
		});
		vi.spyOn(PasswordGenerator, "hashPassword").mockResolvedValue("generated-password-hash");
		vi.spyOn(PasswordValidator, "comparePasswordHashes").mockReturnValue(true);
		vi.spyOn(TokenHelper, "createToken").mockResolvedValue({
			token: "jwt-token",
			expiry: 123456789
		});

		await service.start();
		const result = await service.login("user@example.com", "correct-password");

		expect(result).toEqual({
			accountId: "user-1",
			token: "jwt-token",
			expiry: 123456789,
			profileReadOnly: false,
			roles: ["user"]
		});
		expect(TokenHelper.createToken).toHaveBeenCalledWith(
			mockVaultConnector,
			"node-1",
			"auth-signing",
			"user-1",
			"tenant-1",
			60,
			0,
			undefined,
			undefined
		);
		expect(mockUserEntityStorage.set).toHaveBeenCalledWith(
			expect.objectContaining({
				accountId: "user-1",
				password: "stored-password-hash",
				dateLastLogin: expect.any(String)
			})
		);
		expect(mockAuthenticationRateService.clear).toHaveBeenCalledWith("login", "user@example.com");
		// The account wide limit is only checked, and so only cleared, with per client limiting.
		expect(mockAuthenticationRateService.clear).toHaveBeenCalledTimes(1);
		// The provider gives the account id, so the account is read again by it.
		expect(mockUserEntityStorage.get).toHaveBeenCalledWith("user-1");
		expect(mockUserEntityStorage.query).toHaveBeenCalledTimes(1);
		expect(mockAuthenticationAuditService.create).toHaveBeenCalledWith({
			actorId: "user@example.com",
			event: "login-success",
			data: {
				accountId: "user-1",
				tenantId: "tenant-1"
			}
		});
	});

	it("should find the account by the provider account when the provider gives no account id", async () => {
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.Node]: "node-1"
		});
		vi.mocked(mockUserEntityStorage.get).mockResolvedValue({
			email: "user@example.com",
			accountId: "user-1",
			password: "stored-password-hash",
			salt: "c2FsdA==",
			authProviderId: "entity-storage",
			providerAccountId: "user@example.com",
			dateCreated: "2026-01-01T00:00:00.000Z",
			dateModified: "2026-01-01T00:00:00.000Z"
		});
		vi.spyOn(AuthenticationProviderFactory, "get").mockReturnValue({
			className: () => "PasswordProvider",
			getCapabilities: () => ({
				signInMethod: "password",
				passwordChange: "api",
				profileReadOnly: false
			}),
			authenticate: async () => ({
				providerAccountId: "user@example.com",
				email: "user@example.com"
			})
		});
		vi.spyOn(TokenHelper, "createToken").mockResolvedValue({ token: "jwt-token", expiry: 1 });

		await service.start();
		const result = await service.login("user@example.com", "correct-password");

		expect(result.accountId).toBe("user-1");
		expect(mockUserEntityStorage.query).toHaveBeenCalledWith(
			expect.objectContaining({
				conditions: expect.arrayContaining([
					expect.objectContaining({ property: "providerAccountId", value: "user@example.com" })
				])
			}),
			undefined,
			undefined,
			undefined,
			1
		);
	});

	it("should refuse a login when the account read by its id is not a password account", async () => {
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.Node]: "node-1"
		});
		vi.mocked(mockUserEntityStorage.get).mockResolvedValue({
			email: "user@example.com",
			accountId: "user-1",
			authProviderId: "google",
			dateCreated: "2026-01-01T00:00:00.000Z",
			dateModified: "2026-01-01T00:00:00.000Z"
		});
		vi.spyOn(AuthenticationProviderFactory, "get").mockReturnValue({
			className: () => "PasswordProvider",
			getCapabilities: () => ({
				signInMethod: "password",
				passwordChange: "api",
				profileReadOnly: false
			}),
			authenticate: async () => ({
				providerAccountId: "user@example.com",
				accountId: "user-1",
				email: "user@example.com"
			})
		});
		const createTokenSpy = vi.spyOn(TokenHelper, "createToken");

		await service.start();
		await expect(service.login("user@example.com", "correct-password")).rejects.toMatchObject({
			name: UnauthorizedError.CLASS_NAME,
			message: "entityStorageAuthenticationService.loginFailed"
		});
		expect(createTokenSpy).not.toHaveBeenCalled();
	});

	it("should login with the account id when there is no tenant", async () => {
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.Node]: "node-1"
		});
		vi.mocked(mockUserEntityStorage.get).mockResolvedValue({
			email: "user@example.com",
			accountId: "user-1",
			password: "stored-password-hash",
			salt: "c2FsdA==",
			authProviderId: "entity-storage",
			dateCreated: "2026-01-01T00:00:00.000Z",
			dateModified: "2026-01-01T00:00:00.000Z"
		});
		vi.spyOn(PasswordGenerator, "hashPassword").mockResolvedValue("generated-password-hash");
		vi.spyOn(PasswordValidator, "comparePasswordHashes").mockReturnValue(true);
		vi.spyOn(TokenHelper, "createToken").mockResolvedValue({
			token: "jwt-token",
			expiry: 123456789
		});

		await service.start();
		await service.login("user@example.com", "correct-password");

		expect(TokenHelper.createToken).toHaveBeenCalledWith(
			mockVaultConnector,
			"node-1",
			"auth-signing",
			"user-1",
			undefined,
			60,
			0,
			undefined,
			undefined
		);
	});

	it("should throw UnauthorizedError when login password does not match", async () => {
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.Node]: "node-1"
		});
		vi.mocked(mockUserEntityStorage.get).mockResolvedValue({
			email: "user@example.com",
			accountId: "user-1",
			password: "stored-password-hash",
			salt: "c2FsdA==",
			authProviderId: "entity-storage",
			dateCreated: "2026-01-01T00:00:00.000Z",
			dateModified: "2026-01-01T00:00:00.000Z"
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

	it("should throw UnauthorizedError when the account has no password", async () => {
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.Node]: "node-1"
		});
		vi.mocked(mockUserEntityStorage.get).mockResolvedValue({
			email: "user@example.com",
			accountId: "user-1",
			authProviderId: "google",
			providerAccountId: "google-subject-1",
			dateCreated: "2026-01-01T00:00:00.000Z",
			dateModified: "2026-01-01T00:00:00.000Z"
		});
		const hashSpy = vi.spyOn(PasswordGenerator, "hashPassword");

		await service.start();

		await expect(service.login("user@example.com", "any-password")).rejects.toThrow(
			UnauthorizedError
		);
		expect(hashSpy).not.toHaveBeenCalled();
		expect(mockUserEntityStorage.set).not.toHaveBeenCalled();
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
			accountId: "user-1",
			password: "stored-password-hash",
			salt: "c2FsdA==",
			authProviderId: "entity-storage",
			dateCreated: "2026-01-01T00:00:00.000Z",
			dateModified: "2026-01-01T00:00:00.000Z"
		});
		vi.spyOn(PasswordGenerator, "hashPassword").mockResolvedValue("generated-password-hash");
		vi.spyOn(PasswordValidator, "comparePasswordHashes").mockReturnValue(true);
		vi.spyOn(TokenHelper, "createToken").mockRejectedValue(new Error("token generation failed"));

		await service.start();

		await expect(service.login("user@example.com", "correct-password")).rejects.toThrow(
			UnauthorizedError
		);
	});

	it("should return the password lengths the validator applies when none are configured", async () => {
		await expect(service.passwordPolicy()).resolves.toEqual({
			minPasswordLength: 15,
			maxPasswordLength: 128
		});

		const configured = createService({
			config: { minPasswordLength: 8, maxPasswordLength: 64 }
		});
		await expect(configured.passwordPolicy()).resolves.toEqual({
			minPasswordLength: 8,
			maxPasswordLength: 64
		});
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
		expect(mockAuthenticationRateService.registerAction).toHaveBeenCalledWith("login-provider", {
			maxAttempts: 20,
			windowMinutes: 15
		});
		expect(mockAuthenticationRateService.registerAction).toHaveBeenCalledWith("register", {
			maxAttempts: 5,
			windowMinutes: 60
		});
		expect(mockAuthenticationRateService.registerAction).toHaveBeenCalledWith("password-forgot", {
			maxAttempts: 5,
			windowMinutes: 60
		});
		expect(mockAuthenticationRateService.registerAction).toHaveBeenCalledWith("password-reset", {
			maxAttempts: 10,
			windowMinutes: 15
		});
		expect(mockAuthenticationRateService.registerAction).toHaveBeenCalledWith("login-client", {
			maxAttempts: 20,
			windowMinutes: 15
		});
		expect(mockAuthenticationRateService.registerAction).toHaveBeenCalledWith("login-account", {
			maxAttempts: 50,
			windowMinutes: 60
		});
		expect(mockAuthenticationRateService.registerAction).toHaveBeenCalledWith("register-verify", {
			maxAttempts: 10,
			windowMinutes: 15
		});
		expect(mockAuthenticationRateService.registerAction).toHaveBeenCalledTimes(10);
	});

	it("should register login rate action on start when configured", async () => {
		service = createService({
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
		expect(mockAuthenticationRateService.unregisterAction).toHaveBeenCalledWith("login-provider");
		expect(mockAuthenticationRateService.unregisterAction).toHaveBeenCalledWith("register");
		expect(mockAuthenticationRateService.unregisterAction).toHaveBeenCalledWith("password-forgot");
		expect(mockAuthenticationRateService.unregisterAction).toHaveBeenCalledWith("password-reset");
		expect(mockAuthenticationRateService.unregisterAction).toHaveBeenCalledWith("login-client");
		expect(mockAuthenticationRateService.unregisterAction).toHaveBeenCalledWith("login-account");
		expect(mockAuthenticationRateService.unregisterAction).toHaveBeenCalledWith("register-verify");
		expect(mockAuthenticationRateService.unregisterAction).toHaveBeenCalledTimes(10);
	});

	it("should refuse a rate limited login as a failed login without trying the password", async () => {
		service = createService({
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
			accountId: "user-1",
			password: "stored-password-hash",
			salt: "c2FsdA==",
			authProviderId: "entity-storage",
			dateCreated: "2026-01-01T00:00:00.000Z",
			dateModified: "2026-01-01T00:00:00.000Z"
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

		const hashSpy = vi.mocked(PasswordGenerator.hashPassword);

		await service.start();
		const loginAttempt = service.login("User@Example.com", "wrong-password");

		await expect(loginAttempt).rejects.toMatchObject({
			name: "UnauthorizedError",
			message: "entityStorageAuthenticationService.loginFailed"
		});
		expect(hashSpy).not.toHaveBeenCalled();
		expect(mockAuthenticationRateService.check).toHaveBeenCalledWith("login", "user@example.com");
		expect(mockAuthenticationRateService.clear).not.toHaveBeenCalled();
	});

	it("should refresh a token after verifyUser confirms the stored user", async () => {
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.Node]: "node-1"
		});
		vi.mocked(mockUserEntityStorage.get).mockResolvedValue({
			email: "user@example.com",
			accountId: "user-1",
			password: "stored-password-hash",
			salt: "c2FsdA==",
			authProviderId: "entity-storage",
			dateCreated: "2026-01-01T00:00:00.000Z",
			dateModified: "2026-01-01T00:00:00.000Z"
		});
		vi.spyOn(TokenHelper, "verify").mockImplementation(
			async (vaultConnector, nodeId, signingKeyName, token, verifyUser) => {
				const verified = await verifyUser?.("user-1", undefined, 0);
				expect(verified).toEqual(["user"]);
				return {
					header: { alg: "EdDSA" },
					payload: {
						sub: "user-1"
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
		expect(mockUserEntityStorage.get).toHaveBeenCalledWith("user-1");
		// A token from an earlier version without a session start keeps none, so it is never a
		// recent sign in, and is limited per account.
		expect(TokenHelper.createToken).toHaveBeenCalledWith(
			mockVaultConnector,
			"node-1",
			"auth-signing",
			"user-1",
			undefined,
			60,
			0,
			null,
			undefined
		);
		expect(mockAuthenticationRateService.check).toHaveBeenCalledWith("token-refresh", "user-1");
		expect(mockAuthenticationRateService.clear).not.toHaveBeenCalled();
		expect(mockAuthenticationAuditService.create).toHaveBeenCalledWith({
			actorId: "user-1",
			event: "token-refreshed",
			data: {
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
				await verifyUser?.("user-1", undefined, undefined);
				return {
					header: { alg: "EdDSA" },
					payload: {
						sub: "user-1",
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
			accountId: "user-1",
			password: "stored-password-hash",
			salt: "c2FsdA==",
			authProviderId: "entity-storage",
			dateCreated: "2026-01-01T00:00:00.000Z",
			dateModified: "2026-01-01T00:00:00.000Z"
		});
		const createTokenSpy = vi.spyOn(TokenHelper, "createToken");
		vi.spyOn(TokenHelper, "verify").mockImplementation(
			async (vaultConnector, nodeId, signingKeyName, token, verifyUser) => {
				const verified = await verifyUser?.("user-other", undefined, 0);
				if (!verified?.includes("user")) {
					throw new UnauthorizedError(TokenHelper.CLASS_NAME, "userNotVerified");
				}

				return {
					header: { alg: "EdDSA" },
					payload: {
						sub: "user-other"
					}
				};
			}
		);

		await service.start();

		await expect(service.refresh("existing-token")).rejects.toThrow(UnauthorizedError);
		expect(mockUserEntityStorage.get).toHaveBeenCalledWith("user-other");
		expect(createTokenSpy).not.toHaveBeenCalled();
	});

	it("should throw UnauthorizedError when refresh token passwordVersion is stale after a password change", async () => {
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.Node]: "node-1"
		});
		vi.mocked(mockUserEntityStorage.get).mockResolvedValue({
			email: "user@example.com",
			accountId: "user-1",
			password: "stored-password-hash",
			salt: "c2FsdA==",
			authProviderId: "entity-storage",
			dateCreated: "2026-01-01T00:00:00.000Z",
			dateModified: "2026-01-01T00:00:00.000Z",
			passwordVersion: 2
		});
		const createTokenSpy = vi.spyOn(TokenHelper, "createToken");
		vi.spyOn(TokenHelper, "verify").mockImplementation(
			async (vaultConnector, nodeId, signingKeyName, token, verifyUser) => {
				// pver=1 in token but user has passwordVersion=2 - simulate stale token
				const verified = await verifyUser?.("user-1", undefined, 1);
				if (!verified?.includes("user")) {
					throw new UnauthorizedError(TokenHelper.CLASS_NAME, "userNotVerified");
				}
				return {
					header: { alg: "EdDSA" },
					payload: { sub: "user-1" }
				};
			}
		);

		await service.start();

		await expect(service.refresh("existing-token")).rejects.toThrow(UnauthorizedError);
		expect(mockUserEntityStorage.get).toHaveBeenCalledWith("user-1");
		expect(createTokenSpy).not.toHaveBeenCalled();
	});

	it("should update the password for the current user and keep the session with a new token", async () => {
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.Node]: "node-1",
			[ContextIdKeys.Tenant]: "tenant-1",
			[ContextIdKeys.Account]: "user-1"
		});
		const user: AuthenticationUser = {
			email: "user@example.com",
			accountId: "user-1",
			password: "stored-password-hash",
			salt: "c2FsdA==",
			authProviderId: "entity-storage",
			dateCreated: "2026-01-01T00:00:00.000Z",
			dateModified: "2026-01-01T00:00:00.000Z",
			passwordVersion: 2
		};
		vi.mocked(mockUserEntityStorage.get).mockResolvedValue(user);
		vi.spyOn(PasswordHelper, "updatePassword").mockResolvedValue({ ...user, passwordVersion: 3 });
		vi.spyOn(TokenHelper, "verify").mockResolvedValue({
			header: { alg: "EdDSA" },
			payload: { sub: "user-1", sst: 1700000000 }
		});
		vi.spyOn(TokenHelper, "createToken").mockResolvedValue({ token: "new-jwt", expiry: 123 });

		await service.start();
		const result = await service.updatePassword("current-password", "new-password", "old-jwt");

		expect(result).toEqual({ token: "new-jwt", expiry: 123 });
		expect(TokenHelper.verify).toHaveBeenCalledWith(
			mockVaultConnector,
			"node-1",
			"auth-signing",
			"old-jwt"
		);
		// The new token carries the new password version and keeps the session start.
		expect(TokenHelper.createToken).toHaveBeenCalledWith(
			mockVaultConnector,
			"node-1",
			"auth-signing",
			"user-1",
			"tenant-1",
			60,
			3,
			1700000000,
			undefined
		);

		expect(mockAuthenticationRateService.check).toHaveBeenCalledWith("password-change", "user-1");
		expect(mockUserEntityStorage.get).toHaveBeenCalledWith("user-1");
		expect(PasswordHelper.updatePassword).toHaveBeenCalledWith(
			mockUserEntityStorage,
			mockAuthenticationAuditService,
			expect.objectContaining({ email: "user@example.com", accountId: "user-1" }),
			"new-password",
			"current-password",
			{ minPasswordLength: undefined, maxPasswordLength: undefined },
			{
				requireCurrentPassword: true,
				passwordHashOptions: undefined,
				passwordResetEntityStorage: mockUserEntityStorage
			}
		);
		expect(mockAuthenticationRateService.clear).toHaveBeenCalledWith("password-change", "user-1");
	});

	it("should keep the session start given by the request processor without verifying the token again", async () => {
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.Node]: "node-1",
			[ContextIdKeys.Account]: "user-1"
		});
		const user: AuthenticationUser = {
			email: "user@example.com",
			accountId: "user-1",
			password: "stored-password-hash",
			salt: "c2FsdA==",
			authProviderId: "entity-storage",
			dateCreated: "2026-01-01T00:00:00.000Z",
			dateModified: "2026-01-01T00:00:00.000Z"
		};
		vi.mocked(mockUserEntityStorage.get).mockResolvedValue(user);
		vi.spyOn(PasswordHelper, "updatePassword").mockResolvedValue({ ...user, passwordVersion: 1 });
		const verifySpy = vi.spyOn(TokenHelper, "verify");
		vi.spyOn(TokenHelper, "createToken").mockResolvedValue({ token: "new-jwt", expiry: 123 });

		await service.start();
		await service.updatePassword("current-password", "new-password", "old-jwt", 1700000000);

		expect(verifySpy).not.toHaveBeenCalled();
		expect(vi.mocked(TokenHelper.createToken).mock.calls[0][7]).toBe(1700000000);
	});

	it("should start a new session when updating the password without a token", async () => {
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.Node]: "node-1",
			[ContextIdKeys.Account]: "user-1"
		});
		const user: AuthenticationUser = {
			email: "user@example.com",
			accountId: "user-1",
			password: "stored-password-hash",
			salt: "c2FsdA==",
			authProviderId: "entity-storage",
			dateCreated: "2026-01-01T00:00:00.000Z",
			dateModified: "2026-01-01T00:00:00.000Z"
		};
		vi.mocked(mockUserEntityStorage.get).mockResolvedValue(user);
		vi.spyOn(PasswordHelper, "updatePassword").mockResolvedValue({ ...user, passwordVersion: 1 });
		const verifySpy = vi.spyOn(TokenHelper, "verify");
		vi.spyOn(TokenHelper, "createToken").mockResolvedValue({ token: "new-jwt", expiry: 123 });

		await service.start();
		await service.updatePassword("current-password", "new-password");

		expect(verifySpy).not.toHaveBeenCalled();
		expect(vi.mocked(TokenHelper.createToken).mock.calls[0][7]).toBeUndefined();
	});

	it("should refuse a token for another account without changing the password", async () => {
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.Node]: "node-1",
			[ContextIdKeys.Account]: "user-1"
		});
		vi.mocked(mockUserEntityStorage.get).mockResolvedValue({
			email: "user@example.com",
			accountId: "user-1",
			password: "stored-password-hash",
			salt: "c2FsdA==",
			authProviderId: "entity-storage",
			dateCreated: "2026-01-01T00:00:00.000Z",
			dateModified: "2026-01-01T00:00:00.000Z"
		});
		const updateSpy = vi.spyOn(PasswordHelper, "updatePassword");
		vi.spyOn(TokenHelper, "verify").mockResolvedValue({
			header: { alg: "EdDSA" },
			payload: { sub: "user-2", sst: 1700000000 }
		});

		await service.start();
		await expect(
			service.updatePassword("current-password", "new-password", "other-jwt")
		).rejects.toMatchObject({
			name: UnauthorizedError.CLASS_NAME,
			message: "entityStorageAuthenticationService.tokenAccountMismatch"
		});
		expect(updateSpy).not.toHaveBeenCalled();
	});

	it("should throw TooManyRequestsError when password change rate limit is exceeded", async () => {
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.Account]: "user-1"
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
			[ContextIdKeys.Account]: "user-missing"
		});
		vi.mocked(mockUserEntityStorage.get).mockResolvedValue(undefined);

		await expect(service.updatePassword("current-password", "new-password")).rejects.toThrow(
			NotFoundError
		);
		expect(mockAuthenticationRateService.clear).not.toHaveBeenCalled();
	});

	it("should logout without throwing", async () => {
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.Account]: "user-1"
		});

		await expect(service.logout("token")).resolves.toBeUndefined();
		expect(mockAuthenticationAuditService.create).toHaveBeenCalledWith({
			actorId: "user-1",
			event: "logout"
		});
	});

	it("should list the registered authentication providers", async () => {
		AuthenticationProviderFactory.register("google", () => ({
			className: () => "TestGoogleProvider",
			getCapabilities: () => ({
				signInMethod: "redirect",
				passwordChange: "external",
				profileReadOnly: true
			}),
			authenticate: async () => ({ providerAccountId: "subject-1", email: "user@example.com" })
		}));

		await expect(service.providers()).resolves.toEqual([
			{
				authProviderId: "entity-storage",
				signInMethod: "password",
				passwordChange: "api",
				profileReadOnly: false
			},
			{
				authProviderId: "google",
				signInMethod: "redirect",
				passwordChange: "external",
				profileReadOnly: true
			}
		]);

		AuthenticationProviderFactory.unregister("google");
	});

	describe("loginWithProvider", () => {
		let userEntityStorage: MemoryEntityStorageConnector<AuthenticationUser>;
		let authenticate: ReturnType<typeof vi.fn>;

		beforeEach(async () => {
			userEntityStorage = new MemoryEntityStorageConnector<AuthenticationUser>({
				entitySchema: nameof<AuthenticationUser>(),
				config: { storageKey: "authentication-user-provider" }
			});
			vi.spyOn(EntityStorageConnectorFactory, "get").mockReturnValue(userEntityStorage);

			authenticate = vi.fn().mockResolvedValue({
				providerAccountId: "google-subject-1",
				email: "user@example.com",
				profile: { "@context": "https://schema.org", "@type": "Person", givenName: "Ada" },
				profileReadOnly: true,
				profileEditUrl: "https://accounts.example.com/profile"
			});
			AuthenticationProviderFactory.register("google", () => ({
				className: () => "TestGoogleProvider",
				getCapabilities: () => ({
					signInMethod: "redirect",
					passwordChange: "external",
					profileReadOnly: true
				}),
				authenticate: authenticate as IAuthenticationProvider["authenticate"]
			}));

			vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
				[ContextIdKeys.Node]: "node-1"
			});
			vi.spyOn(TokenHelper, "createToken").mockResolvedValue({
				token: "jwt-token",
				expiry: 123456789
			});

			service = createService();
			await service.start();
		});

		afterEach(async () => {
			AuthenticationProviderFactory.unregister("google");
			await userEntityStorage.teardown();
		});

		it("should create the account on the first login and issue a token for it", async () => {
			vi.spyOn(RandomHelper, "generateUuidV7").mockReturnValue("account-1");

			const result = await service.loginWithProvider("google", { code: "code-1" });

			expect(result).toEqual({
				accountId: "account-1",
				token: "jwt-token",
				expiry: 123456789,
				profile: { "@context": "https://schema.org", "@type": "Person", givenName: "Ada" },
				profileReadOnly: true,
				profileEditUrl: "https://accounts.example.com/profile",
				roles: ["user"]
			});
			expect(authenticate).toHaveBeenCalledWith({ code: "code-1" });
			const stored = await userEntityStorage.get("account-1");
			expect(stored).toMatchObject({
				accountId: "account-1",
				email: "user@example.com",
				authProviderId: "google",
				providerAccountId: "google-subject-1",
				dateLastLogin: expect.any(String)
			});
			expect(stored?.password).toBeUndefined();
			expect(TokenHelper.createToken).toHaveBeenCalledWith(
				mockVaultConnector,
				"node-1",
				"auth-signing",
				"account-1",
				undefined,
				60,
				0,
				undefined,
				undefined
			);
			expect(mockAuthenticationAuditService.create).toHaveBeenCalledWith({
				actorId: "user@example.com",
				event: "account-created",
				data: { accountId: "account-1", authProviderId: "google" }
			});
		});

		it("should reuse the account on later logins", async () => {
			vi.spyOn(RandomHelper, "generateUuidV7")
				.mockReturnValueOnce("account-1")
				.mockReturnValueOnce("account-2");

			await service.loginWithProvider("google", { code: "code-1" });
			await service.loginWithProvider("google", { code: "code-2" });

			const all = await userEntityStorage.query();
			expect(all.entities).toHaveLength(1);
			expect(TokenHelper.createToken).toHaveBeenLastCalledWith(
				mockVaultConnector,
				"node-1",
				"auth-signing",
				"account-1",
				undefined,
				60,
				0,
				undefined,
				undefined
			);
		});

		it("should store the tenant of the latest login, keeping it when the provider gives none", async () => {
			vi.spyOn(RandomHelper, "generateUuidV7").mockReturnValue("account-1");
			authenticate.mockResolvedValueOnce({
				providerAccountId: "google-subject-1",
				email: "user@example.com",
				providerTenantId: "tenant-a"
			});
			await service.loginWithProvider("google", { code: "code-1" });
			expect(await userEntityStorage.get("account-1")).toMatchObject({
				providerTenantId: "tenant-a"
			});

			authenticate.mockResolvedValueOnce({
				providerAccountId: "google-subject-1",
				email: "user@example.com",
				providerTenantId: "tenant-b",
				profileEditUrl: "https://accounts.example.com/other-profile",
				passwordChangeUrl: "https://accounts.example.com/other-password"
			});
			const result = await service.loginWithProvider("google", { code: "code-2" });
			// The login returns the addresses of the identity, they are not stored.
			expect(result).toMatchObject({
				profileEditUrl: "https://accounts.example.com/other-profile",
				passwordChangeUrl: "https://accounts.example.com/other-password"
			});
			const stored = await userEntityStorage.get("account-1");
			expect(stored).toMatchObject({ providerTenantId: "tenant-b" });
			expect(stored).not.toHaveProperty("profileEditUrl");
			expect(stored).not.toHaveProperty("passwordChangeUrl");

			authenticate.mockResolvedValueOnce({
				providerAccountId: "google-subject-1",
				email: "user@example.com"
			});
			await service.loginWithProvider("google", { code: "code-3" });
			expect(await userEntityStorage.get("account-1")).toMatchObject({
				providerTenantId: "tenant-b"
			});
		});

		it("should keep a provider account separate from a password account with the same email", async () => {
			await userEntityStorage.set({
				accountId: "password-account",
				email: "user@example.com",
				password: "stored-password-hash",
				salt: "c2FsdA==",
				authProviderId: "entity-storage",
				providerAccountId: "user@example.com",
				dateCreated: "2026-01-01T00:00:00.000Z",
				dateModified: "2026-01-01T00:00:00.000Z"
			});
			vi.spyOn(RandomHelper, "generateUuidV7").mockReturnValue("google-account");

			await service.loginWithProvider("google", { code: "code-1" });

			const all = await userEntityStorage.query();
			expect(all.entities.map(e => e.accountId).sort()).toEqual([
				"google-account",
				"password-account"
			]);
		});

		it("should store the provider profile as account data, keeping personal details private", async () => {
			const accountAdmin = {
				className: () => "accountAdmin",
				query: vi.fn().mockResolvedValue({ entities: [] }),
				create: vi.fn().mockResolvedValue("item-1"),
				update: vi.fn().mockResolvedValue(undefined)
			};
			vi.mocked(ComponentFactory.getIfExists).mockImplementation(componentName => {
				if (componentName === "authentication-account-admin") {
					return accountAdmin;
				}
				return undefined;
			});
			service = createService();
			await service.start();
			authenticate.mockResolvedValue({
				providerAccountId: "google-subject-1",
				email: "user@example.com",
				profile: {
					"@context": "https://schema.org",
					"@type": "Person",
					email: "user@example.com",
					name: "Ada Lovelace",
					givenName: "Ada",
					familyName: "Lovelace",
					image: "https://example.com/ada.png"
				}
			});
			vi.spyOn(RandomHelper, "generateUuidV7").mockReturnValue("account-1");

			await service.loginWithProvider("google", { code: "code-1" });

			// The provider owns the profile, so it is stored read only.
			expect(accountAdmin.create).toHaveBeenCalledWith(
				"account-1",
				"public-profile",
				{
					"@context": "https://schema.org",
					"@type": "Person",
					name: "Ada Lovelace",
					image: "https://example.com/ada.png",
					readonlyValue: true
				},
				true
			);
			expect(accountAdmin.create).toHaveBeenCalledWith(
				"account-1",
				"private-profile",
				{
					"@context": "https://schema.org",
					"@type": "Person",
					givenName: "Ada",
					familyName: "Lovelace",
					email: "user@example.com",
					readonlyValue: true
				},
				true
			);

			// A later login replaces the stored profile with the one the provider now holds.
			accountAdmin.query.mockResolvedValue({
				entities: [
					{ id: "other", isDefault: false },
					{ id: "item-1", isDefault: true }
				]
			});
			await service.loginWithProvider("google", { code: "code-2" });

			expect(accountAdmin.update).toHaveBeenCalledWith(
				"item-1",
				expect.objectContaining({ givenName: "Ada" }),
				true
			);
		});

		it("should not write a stored provider profile that has not changed", async () => {
			const publicProfile = {
				"@context": "https://schema.org",
				"@type": "Person",
				name: "Ada Lovelace",
				readonlyValue: true
			};
			const privateProfile = {
				"@context": "https://schema.org",
				"@type": "Person",
				givenName: "Ada",
				familyName: "Lovelace",
				email: "user@example.com",
				readonlyValue: true
			};
			const accountAdmin = {
				className: () => "accountAdmin",
				query: vi.fn(async (accountId: string, type: string) => ({
					entities: [
						type === "public-profile"
							? { id: "public-1", isDefault: true, data: { ...publicProfile, name: "Ada" } }
							: { id: "private-1", isDefault: true, data: privateProfile }
					]
				})),
				create: vi.fn(),
				update: vi.fn().mockResolvedValue(undefined)
			};
			const getIfExists = vi.mocked(ComponentFactory.getIfExists);
			getIfExists.mockImplementation(componentName => {
				if (componentName === "authentication-account-admin") {
					return accountAdmin;
				}
				return undefined;
			});
			getIfExists.mockClear();
			service = createService();
			await service.start();
			authenticate.mockResolvedValue({
				providerAccountId: "google-subject-1",
				email: "user@example.com",
				profile: {
					"@context": "https://schema.org",
					"@type": "Person",
					email: "user@example.com",
					name: "Ada Lovelace",
					givenName: "Ada",
					familyName: "Lovelace"
				}
			});
			vi.spyOn(RandomHelper, "generateUuidV7").mockReturnValue("account-1");

			await service.loginWithProvider("google", { code: "code-1" });
			await service.loginWithProvider("google", { code: "code-2" });

			// Only the public profile differs from the stored one, so only it is written.
			expect(accountAdmin.create).not.toHaveBeenCalled();
			expect(accountAdmin.update).toHaveBeenCalledTimes(2);
			expect(accountAdmin.update).toHaveBeenCalledWith("public-1", publicProfile, true);
			expect(accountAdmin.update).not.toHaveBeenCalledWith(
				"private-1",
				expect.anything(),
				expect.anything()
			);
			// The component is resolved once and kept.
			expect(
				getIfExists.mock.calls.filter(([name]) => name === "authentication-account-admin")
			).toHaveLength(1);
		});

		it("should refuse password logins so they stay rate limited", async () => {
			await expect(
				service.loginWithProvider("entity-storage", {
					email: "missing@example.com",
					password: "any-password"
				})
			).rejects.toThrow(UnauthorizedError);
			expect((await userEntityStorage.query()).entities).toHaveLength(0);
		});

		it("should reject an unknown provider", async () => {
			await expect(service.loginWithProvider("unknown", {})).rejects.toThrow(UnauthorizedError);
			expect(mockAuthenticationAuditService.create).toHaveBeenCalledWith({
				actorId: "unknown",
				event: "login-failure"
			});
		});

		it("should give a new account the default roles", async () => {
			const authorization = {
				className: () => "authorization",
				addRoleForSubject: vi.fn(),
				getRolesForSubject: vi.fn().mockResolvedValue(["user"])
			};
			mockAuthorization = authorization;
			vi.mocked(ComponentFactory.getIfExists).mockImplementation(componentName => {
				if (componentName === "authorization") {
					return authorization;
				}
				return undefined;
			});
			vi.spyOn(RandomHelper, "generateUuidV7").mockReturnValue("account-1");
			service = createService();
			await service.start();

			await service.loginWithProvider("google", { code: "code-1" });
			const result = await service.loginWithProvider("google", { code: "code-2" });

			expect(result.roles).toEqual(["user"]);
			expect(authorization.getRolesForSubject).toHaveBeenCalledWith("system", "account-1");
			expect(authorization.addRoleForSubject).toHaveBeenCalledTimes(1);
			expect(authorization.addRoleForSubject).toHaveBeenCalledWith("system", "account-1", "user");
		});

		it("should give the configured roles in the configured model", async () => {
			const authorization = {
				className: () => "authorization",
				addRoleForSubject: vi.fn(),
				getRolesForSubject: vi.fn().mockResolvedValue(["user"])
			};
			mockAuthorization = authorization;
			vi.mocked(ComponentFactory.getIfExists).mockImplementation(componentName => {
				if (componentName === "authorization") {
					return authorization;
				}
				return undefined;
			});
			vi.spyOn(RandomHelper, "generateUuidV7").mockReturnValue("account-1");
			service = createService({
				config: { defaultRoles: ["trader", "viewer"], authorizationModelId: "trade" }
			});
			await service.start();

			await service.loginWithProvider("google", { code: "code-1" });

			expect(authorization.addRoleForSubject).toHaveBeenCalledWith("trade", "account-1", "trader");
			expect(authorization.addRoleForSubject).toHaveBeenCalledWith("trade", "account-1", "viewer");
		});

		it("should rate limit provider logins by the hashed client address", async () => {
			vi.mocked(ContextIdStore.getContextIds).mockResolvedValue({
				[ContextIdKeys.Node]: "node-1",
				ipAddress: "203.0.113.7"
			});
			vi.spyOn(RandomHelper, "generateUuidV7").mockReturnValue("account-1");
			service = createService({
				config: { clientAddressRateLimitEnabled: true }
			});
			await service.start();

			await service.loginWithProvider("google", { code: "code-1" });

			const key = vi.mocked(mockAuthenticationRateService.check).mock.calls[0][1];
			expect(mockAuthenticationRateService.check).toHaveBeenCalledWith("login-provider", key);
			expect(key).toMatch(/^google\|ip-[\da-f]{64}$/);
			expect(key).not.toContain("203.0.113.7");
			expect(mockAuthenticationRateService.clear).toHaveBeenCalledWith("login-provider", key);
		});

		it("should rate limit provider logins per provider account, not in a bucket shared by every client", async () => {
			vi.spyOn(RandomHelper, "generateUuidV7").mockReturnValue("account-1");

			await service.loginWithProvider("google", { code: "code-1" });

			expect(mockAuthenticationRateService.check).toHaveBeenCalledTimes(1);
			expect(mockAuthenticationRateService.check).toHaveBeenCalledWith(
				"login-provider",
				"google|subject|google-subject-1"
			);
			expect(mockAuthenticationRateService.clear).toHaveBeenCalledWith(
				"login-provider",
				"google|subject|google-subject-1"
			);
		});

		it("should not rate limit provider logins by an untrusted client address", async () => {
			vi.mocked(ContextIdStore.getContextIds).mockResolvedValue({
				[ContextIdKeys.Node]: "node-1",
				ipAddress: "203.0.113.7"
			});
			vi.spyOn(RandomHelper, "generateUuidV7").mockReturnValue("account-1");

			await service.loginWithProvider("google", { code: "code-1" });

			expect(mockAuthenticationRateService.check).toHaveBeenCalledTimes(1);
			expect(mockAuthenticationRateService.check).toHaveBeenCalledWith(
				"login-provider",
				"google|subject|google-subject-1"
			);
		});

		it("should refuse a rate limited provider account as a failed login", async () => {
			vi.mocked(mockAuthenticationRateService.check).mockRejectedValueOnce(
				new TooManyRequestsError("test", "rateLimitExceeded", 20, new Date().toISOString())
			);

			await expect(service.loginWithProvider("google", { code: "code-1" })).rejects.toThrow(
				UnauthorizedError
			);
			expect((await userEntityStorage.query()).entities).toHaveLength(0);
		});

		it("should return a rate limit failure of a client", async () => {
			vi.mocked(ContextIdStore.getContextIds).mockResolvedValue({
				[ContextIdKeys.Node]: "node-1",
				ipAddress: "203.0.113.7"
			});
			service = createService({
				config: { clientAddressRateLimitEnabled: true }
			});
			await service.start();
			vi.mocked(mockAuthenticationRateService.check).mockRejectedValue(
				new TooManyRequestsError("test", "tooMany", 21, "2026-01-01T00:00:00.000Z")
			);

			await expect(service.loginWithProvider("google", { code: "code-1" })).rejects.toThrow(
				TooManyRequestsError
			);
			expect(authenticate).not.toHaveBeenCalled();
		});

		it("should not return the cause of a failed provider login", async () => {
			authenticate.mockRejectedValue(new UnauthorizedError("test", "domainNotAllowed"));

			const error = await service.loginWithProvider("google", { code: "bad" }).catch(e => e);

			expect(error).toMatchObject({
				name: "UnauthorizedError",
				message: "entityStorageAuthenticationService.loginFailed"
			});
			expect(error.cause).toBeUndefined();
		});

		it("should refuse a disabled provider account", async () => {
			vi.spyOn(RandomHelper, "generateUuidV7").mockReturnValue("account-1");
			await service.loginWithProvider("google", { code: "code-1" });
			const stored = await userEntityStorage.get("account-1");
			await userEntityStorage.set({
				...(stored as AuthenticationUser),
				dateDisabled: new Date().toISOString()
			});

			await expect(service.loginWithProvider("google", { code: "code-2" })).rejects.toMatchObject({
				message: "entityStorageAuthenticationService.loginFailed"
			});
		});

		it("should create only one account for concurrent first logins", async () => {
			vi.spyOn(RandomHelper, "generateUuidV7")
				.mockReturnValueOnce("account-1")
				.mockReturnValueOnce("account-2");

			await Promise.all([
				service.loginWithProvider("google", { code: "code-1" }),
				service.loginWithProvider("google", { code: "code-2" })
			]);

			expect((await userEntityStorage.query()).entities).toHaveLength(1);
		});

		it("should store the e-mail address of a new provider account in lower case", async () => {
			authenticate.mockResolvedValue({
				providerAccountId: "google-subject-1",
				email: "User@Example.COM"
			});
			vi.spyOn(RandomHelper, "generateUuidV7").mockReturnValue("account-1");

			await service.loginWithProvider("google", { code: "code-1" });

			expect((await userEntityStorage.get("account-1"))?.email).toBe("user@example.com");
		});

		it("should reject when the provider rejects the credentials", async () => {
			authenticate.mockRejectedValue(new UnauthorizedError("test", "loginFailed"));

			await expect(service.loginWithProvider("google", { code: "bad" })).rejects.toThrow(
				UnauthorizedError
			);
			expect((await userEntityStorage.query()).entities).toHaveLength(0);
		});
	});

	describe("register", () => {
		let userEntityStorage: MemoryEntityStorageConnector<AuthenticationUser>;
		let accountAdmin: {
			className: () => string;
			query: ReturnType<typeof vi.fn>;
			create: ReturnType<typeof vi.fn>;
		};
		let authorization: {
			className: () => string;
			addRoleForSubject: ReturnType<typeof vi.fn>;
			getRolesForSubject: ReturnType<typeof vi.fn>;
		};

		beforeEach(async () => {
			userEntityStorage = new MemoryEntityStorageConnector<AuthenticationUser>({
				entitySchema: nameof<AuthenticationUser>(),
				config: { storageKey: "authentication-user-register" }
			});
			vi.spyOn(EntityStorageConnectorFactory, "get").mockReturnValue(userEntityStorage);
			accountAdmin = {
				className: () => "accountAdmin",
				query: vi.fn().mockResolvedValue({ entities: [] }),
				create: vi.fn().mockResolvedValue("item-1")
			};
			authorization = {
				className: () => "authorization",
				addRoleForSubject: vi.fn(),
				getRolesForSubject: vi.fn().mockResolvedValue(["user"])
			};
			mockAuthorization = authorization;
			vi.mocked(ComponentFactory.getIfExists).mockImplementation(componentName => {
				if (componentName === "authentication-account-admin") {
					return accountAdmin;
				}
				if (componentName === "authorization") {
					return authorization;
				}
				return undefined;
			});
			vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
				[ContextIdKeys.Node]: "node-1"
			});
			vi.spyOn(TokenHelper, "createToken").mockResolvedValue({
				token: "jwt-token",
				expiry: 123456789
			});
			vi.spyOn(RandomHelper, "generateUuidV7").mockReturnValue("account-1");
			service = createService();
		});

		afterEach(async () => {
			await userEntityStorage.teardown();
		});

		it("should refuse to sign up when the password provider is not registered", async () => {
			await service.start();
			AuthenticationProviderFactory.unregister(
				EntityStorageAuthenticationAdminService.AUTH_PROVIDER_ID
			);
			try {
				await expect(
					service.register({ email: "new@example.com", password: "Correct-Horse-Battery-42" })
				).rejects.toMatchObject({
					name: "ForbiddenError",
					message: "entityStorageAuthenticationService.selfRegistrationDisabled"
				});
				await expect(service.verifyRegistration("token")).rejects.toMatchObject({
					name: "ForbiddenError",
					message: "entityStorageAuthenticationService.selfRegistrationDisabled"
				});
			} finally {
				registerTestPasswordProvider();
			}
			expect((await userEntityStorage.query()).entities).toHaveLength(0);
		});

		it("should accept a sign up and create an unverified account with an editable profile", async () => {
			await service.start();

			await expect(
				service.register({
					email: "new@example.com",
					password: "Correct-Horse-Battery-42",
					givenName: "Ada",
					familyName: "Lovelace"
				})
			).resolves.toBeUndefined();
			// The account is created after the response, by the queued work.
			expect((await userEntityStorage.query()).entities).toHaveLength(0);
			await service.stop();

			expect(await userEntityStorage.get("account-1")).toMatchObject({
				email: "new@example.com",
				authProviderId: "entity-storage",
				providerAccountId: "new@example.com",
				verified: false
			});
			expect(mockAuthenticationRateService.check).toHaveBeenCalledWith(
				"register",
				"new@example.com"
			);
			// The default roles are given when the sign up is verified.
			expect(authorization.addRoleForSubject).not.toHaveBeenCalled();
			expect(accountAdmin.create).toHaveBeenCalledWith(
				"account-1",
				"private-profile",
				{
					"@context": "https://schema.org",
					"@type": "Person",
					givenName: "Ada",
					familyName: "Lovelace",
					email: "new@example.com"
				},
				true
			);
		});

		it("should accept a sign up of an e-mail address that has a password account without creating another", async () => {
			await service.start();
			await service.register({ email: "new@example.com", password: "Correct-Horse-Battery-42" });

			await expect(
				service.register({ email: "New@Example.com", password: "Correct-Horse-Battery-42" })
			).resolves.toBeUndefined();
			await service.stop();

			expect((await userEntityStorage.query()).entities).toHaveLength(1);
		});

		it("should refuse default roles that include the escalated privilege role", () => {
			expect(() =>
				createService({
					config: { defaultRoles: ["user", "global-admin"] }
				})
			).toThrow(
				expect.objectContaining({
					message: "entityStorageAuthenticationService.defaultRolesEscalated"
				})
			);
		});

		it("should validate the password", async () => {
			await service.start();

			await expect(
				service.register({ email: "new@example.com", password: "short" })
			).rejects.toThrow();
			expect((await userEntityStorage.query()).entities).toHaveLength(0);
		});
	});

	describe("me", () => {
		it("should return the signed in account with its identity and organization", async () => {
			vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
				[ContextIdKeys.Account]: "account-1",
				[ContextIdKeys.User]: "did:example:user",
				[ContextIdKeys.UserOrganization]: "did:example:org"
			});
			vi.mocked(mockUserEntityStorage.get).mockResolvedValue({
				accountId: "account-1",
				email: "user@example.com",
				authProviderId: "google"
			});
			AuthenticationProviderFactory.register("google", () => ({
				className: () => "TestGoogleProvider",
				getCapabilities: () => ({
					signInMethod: "redirect",
					passwordChange: "external",
					profileReadOnly: true,
					profileEditUrl: "https://accounts.example.com/profile"
				}),
				authenticate: vi.fn()
			}));

			try {
				expect(await service.me()).toEqual({
					accountId: "account-1",
					email: "user@example.com",
					authProviderId: "google",
					profileReadOnly: true,
					profileEditUrl: "https://accounts.example.com/profile",
					identity: "did:example:user",
					organization: "did:example:org",
					roles: ["user"]
				});
			} finally {
				AuthenticationProviderFactory.unregister("google");
			}
		});

		it("should return the roles of the account", async () => {
			const authorization = {
				className: () => "authorization",
				addRoleForSubject: vi.fn(),
				getRolesForSubject: vi.fn().mockResolvedValue(["user", "global-admin"])
			};
			mockAuthorization = authorization;
			vi.mocked(ComponentFactory.getIfExists).mockImplementation(componentName => {
				if (componentName === "authorization") {
					return authorization;
				}
				return undefined;
			});
			vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
				[ContextIdKeys.Node]: "node-1",
				[ContextIdKeys.Account]: "account-1"
			});
			vi.mocked(mockUserEntityStorage.get).mockResolvedValue({
				accountId: "account-1",
				email: "user@example.com",
				authProviderId: "entity-storage"
			});
			service = createService();
			await service.start();

			expect((await service.me()).roles).toEqual(["user", "global-admin"]);
			expect(authorization.getRolesForSubject).toHaveBeenCalledWith("system", "account-1");
		});

		it("should return the addresses the provider gives for the stored tenant", async () => {
			vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
				[ContextIdKeys.Account]: "account-1"
			});
			vi.mocked(mockUserEntityStorage.get).mockResolvedValue({
				accountId: "account-1",
				email: "user@outlook.com",
				authProviderId: "microsoft",
				providerTenantId: "tenant-1"
			});
			const getCapabilities = vi.fn().mockReturnValue({
				signInMethod: "redirect",
				passwordChange: "external",
				profileReadOnly: true,
				profileEditUrl: "https://account.microsoft.com/profile",
				passwordChangeUrl: "https://account.live.com/password/Change"
			});
			AuthenticationProviderFactory.register("microsoft", () => ({
				className: () => "TestMicrosoftProvider",
				getCapabilities,
				authenticate: vi.fn()
			}));

			try {
				expect(await service.me()).toMatchObject({
					profileEditUrl: "https://account.microsoft.com/profile",
					passwordChangeUrl: "https://account.live.com/password/Change"
				});
				expect(getCapabilities).toHaveBeenCalledWith("tenant-1");
			} finally {
				AuthenticationProviderFactory.unregister("microsoft");
			}
		});

		it("should require a signed in account", async () => {
			vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({});

			await expect(service.me()).rejects.toThrow();
		});

		it("should report a removed account as not found", async () => {
			vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
				[ContextIdKeys.Account]: "account-1"
			});
			vi.mocked(mockUserEntityStorage.get).mockResolvedValue(undefined);

			await expect(service.me()).rejects.toThrow(NotFoundError);
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

			service = createService();

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
						accountId: "user-1",
						password: "stored-password-hash",
						salt: "c2FsdA==",
						authProviderId: "entity-storage",
						providerAccountId: "user@example.com",
						dateCreated: "2026-01-01T00:00:00.000Z",
						dateModified: "2026-01-01T00:00:00.000Z"
					});

					const result = await service.login("user@example.com", "correct-password");
					expect(result).toEqual({
						accountId: "user-1",
						token: "jwt-token",
						expiry: 123456789,
						profileReadOnly: false,
						roles: ["user"]
					});
				}
			);
		});

		it("should fail to login a user from a different tenant", async () => {
			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_A }, async () => {
				await userEntityStorage.set({
					email: "user@example.com",
					accountId: "user-1",
					password: "stored-password-hash",
					salt: "c2FsdA==",
					authProviderId: "entity-storage",
					providerAccountId: "user@example.com",
					dateCreated: "2026-01-01T00:00:00.000Z",
					dateModified: "2026-01-01T00:00:00.000Z"
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
					accountId: "user-1",
					password: "stored-password-hash",
					salt: "c2FsdA==",
					authProviderId: "entity-storage",
					providerAccountId: "user@example.com",
					dateCreated: "2026-01-01T00:00:00.000Z",
					dateModified: "2026-01-01T00:00:00.000Z"
				});
			});

			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_B }, async () => {
				await userEntityStorage.set({
					email: "user@example.com",
					accountId: "user-b",
					password: "stored-password-hash",
					salt: "c2FsdA==",
					authProviderId: "entity-storage",
					providerAccountId: "user@example.com",
					dateCreated: "2026-01-01T00:00:00.000Z",
					dateModified: "2026-01-01T00:00:00.000Z"
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
			vi.spyOn(PasswordHelper, "updatePassword").mockImplementation(
				async (storage, audit, user) => ({ ...user, passwordVersion: 1 })
			);
			vi.spyOn(TokenHelper, "createToken").mockResolvedValue({ token: "new-jwt", expiry: 1 });

			await ContextIdStore.run(
				{ [ContextIdKeys.Tenant]: TENANT_A, [ContextIdKeys.Account]: "user-1" },
				async () => {
					await userEntityStorage.set({
						email: "user@example.com",
						accountId: "user-1",
						password: "stored-password-hash",
						salt: "c2FsdA==",
						authProviderId: "entity-storage",
						providerAccountId: "user@example.com",
						dateCreated: "2026-01-01T00:00:00.000Z",
						dateModified: "2026-01-01T00:00:00.000Z"
					});

					await service.updatePassword("current-password", "new-password");
					expect(vi.mocked(TokenHelper.createToken).mock.calls[0][4]).toBe(TENANT_A);

					expect(PasswordHelper.updatePassword).toHaveBeenCalledWith(
						userEntityStorage,
						mockAuthenticationAuditService,
						expect.objectContaining({ email: "user@example.com", accountId: "user-1" }),
						"new-password",
						"current-password",
						{ minPasswordLength: undefined, maxPasswordLength: undefined },
						expect.objectContaining({ requireCurrentPassword: true })
					);
				}
			);
		});

		it("should fail to update the password for a user in a different tenant", async () => {
			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_A }, async () => {
				await userEntityStorage.set({
					email: "user@example.com",
					accountId: "user-1",
					password: "stored-password-hash",
					salt: "c2FsdA==",
					authProviderId: "entity-storage",
					providerAccountId: "user@example.com",
					dateCreated: "2026-01-01T00:00:00.000Z",
					dateModified: "2026-01-01T00:00:00.000Z"
				});
			});

			await ContextIdStore.run(
				{ [ContextIdKeys.Tenant]: TENANT_B, [ContextIdKeys.Account]: "user-1" },
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
					accountId: "user-1",
					password: "stored-password-hash",
					salt: "c2FsdA==",
					authProviderId: "entity-storage",
					providerAccountId: "user@example.com",
					dateCreated: "2026-01-01T00:00:00.000Z",
					dateModified: "2026-01-01T00:00:00.000Z"
				});
			});

			vi.spyOn(TokenHelper, "verify").mockImplementation(
				async (vaultConnector, nodeId, signingKeyName, token, verifyUser) => {
					const verified = await verifyUser?.("user-1", undefined, 0);
					if (!verified?.includes("user")) {
						throw new UnauthorizedError(TokenHelper.CLASS_NAME, "userNotVerified");
					}
					return {
						header: { alg: "EdDSA" },
						payload: { sub: "user-1", tid: TENANT_B }
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
			accountId: "user-1",
			password: "stored-password-hash",
			salt: "c2FsdA==",
			authProviderId: "entity-storage",
			dateCreated: "2026-01-01T00:00:00.000Z",
			dateModified: "2026-01-01T00:00:00.000Z"
		});
		vi.spyOn(TokenHelper, "verify").mockImplementation(
			async (vaultConnector, nodeId, signingKeyName, token, verifyUser) => {
				const verified = await verifyUser?.("user-1", "tenant-a", 0);
				if (!verified?.includes("tenant")) {
					throw new UnauthorizedError(TokenHelper.CLASS_NAME, "tenantNotVerified");
				}
				return {
					header: { alg: "EdDSA" },
					payload: {
						sub: "user-1",
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
			accountId: "user-1",
			password: "stored-password-hash",
			salt: "c2FsdA==",
			authProviderId: "entity-storage",
			dateCreated: "2026-01-01T00:00:00.000Z",
			dateModified: "2026-01-01T00:00:00.000Z"
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
		service = createService();

		vi.spyOn(TokenHelper, "verify").mockImplementation(
			async (vaultConnector, nodeId, signingKeyName, token, verifyUser) => {
				const verified = await verifyUser?.("user-1", "tenant-a", 0);
				if (!verified?.includes("tenant")) {
					throw new UnauthorizedError(TokenHelper.CLASS_NAME, "tenantNotVerified");
				}
				return {
					header: { alg: "EdDSA" },
					payload: {
						sub: "user-1",
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
			accountId: "user-1",
			password: "stored-password-hash",
			salt: "c2FsdA==",
			authProviderId: "entity-storage",
			dateCreated: "2026-01-01T00:00:00.000Z",
			dateModified: "2026-01-01T00:00:00.000Z"
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
		service = createService();

		vi.spyOn(TokenHelper, "verify").mockImplementation(
			async (vaultConnector, nodeId, signingKeyName, token, verifyUser) => {
				const verified = await verifyUser?.("user-1", "tenant-a", 0);
				expect(verified).toContain("tenant");
				return {
					header: { alg: "EdDSA" },
					payload: {
						sub: "user-1",
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
			"user-1",
			"tenant-a",
			60,
			0,
			null,
			undefined
		);
	});
});
