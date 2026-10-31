// Copyright 2026 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import {
	AuthenticationAccountHelper,
	type IAuthenticationAccountAdminComponent,
	type IAuthenticationAccountData,
	type IAuthenticationAuditComponent
} from "@3sixty/api-auth-models";
import { ForbiddenError, HttpErrorHelper } from "@3sixty/api-models";
import type { IAuthorizationComponent } from "@3sixty/authorization-models";
import { ContextIdKeys, ContextIdStore } from "@3sixty/context";
import {
	ComponentFactory,
	GeneralError,
	Is,
	NotFoundError,
	RandomHelper,
	UnauthorizedError
} from "@3sixty/core";
import { PasswordValidator } from "@3sixty/crypto";
import { MemoryEntityStorageConnector } from "@3sixty/entity-storage-connector-memory";
import { EntityStorageConnectorFactory } from "@3sixty/entity-storage-models";
import { nameof } from "@3sixty/nameof";
import { HttpStatusCode } from "@3sixty/web";
import type { AuthenticationUser } from "../../src/entities/authenticationUser.js";
import { initSchema } from "../../src/schema.js";
import { EntityStorageAuthenticationAdminService } from "../../src/services/entityStorageAuthenticationAdminService.js";
import { PasswordHelper } from "../../src/utils/passwordHelper.js";

initSchema();

const HASHED = {
	password: "hashed-password",
	salt: "AQIDBA==",
	passwordAlgorithm: "argon2id",
	passwordHashParameters: "t=2,m=19456,p=1"
};

describe("EntityStorageAuthenticationAdminService", () => {
	let mockAuthenticationAuditService: IAuthenticationAuditComponent;
	let userEntityStorage: MemoryEntityStorageConnector<AuthenticationUser>;
	let service: EntityStorageAuthenticationAdminService;

	beforeEach(() => {
		vi.restoreAllMocks();
		vi.spyOn(RandomHelper, "generateUuidV7").mockReturnValue("user-1");

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

	it("should create a user with an allocated account id", async () => {
		vi.spyOn(PasswordValidator, "validatePassword").mockImplementation(() => {});
		vi.spyOn(PasswordHelper, "hashPassword").mockResolvedValue(HASHED);

		await service.create({
			email: " User@Example.com ",
			password: "correct-horse-battery"
		});

		expect(PasswordValidator.validatePassword).toHaveBeenCalledWith("correct-horse-battery", {
			minLength: 10
		});
		expect(await userEntityStorage.get("user@example.com", "email")).toEqual({
			email: "user@example.com",
			salt: "AQIDBA==",
			authProviderId: "entity-storage",
			providerAccountId: "user@example.com",
			dateCreated: expect.any(String),
			dateModified: expect.any(String),
			password: "hashed-password",
			passwordAlgorithm: "argon2id",
			passwordHashParameters: "t=2,m=19456,p=1",
			accountId: "user-1",
			passwordVersion: 0
		});
		expect(mockAuthenticationAuditService.create).toHaveBeenCalledWith({
			actorId: "user@example.com",
			event: "account-created",
			data: {
				disabled: false,
				accountId: "user-1",
				email: "user@example.com",
				actorAccountId: undefined,
				tenantId: undefined,
				originalTenantId: undefined
			}
		});
	});

	it("should create two accounts and give each its own id", async () => {
		vi.spyOn(PasswordValidator, "validatePassword").mockImplementation(() => {});
		vi.spyOn(PasswordHelper, "hashPassword").mockResolvedValue(HASHED);
		vi.spyOn(RandomHelper, "generateUuidV7")
			.mockReturnValueOnce("user-1")
			.mockReturnValueOnce("user-2");

		await service.create({
			email: "User@Example.com",
			password: "correct-horse-battery"
		});
		await service.create({
			email: "other@example.com",
			password: "correct-horse-battery"
		});

		expect(await userEntityStorage.get("user@example.com", "email")).toMatchObject({
			accountId: "user-1",
			email: "user@example.com"
		});
		expect(await userEntityStorage.get("other@example.com", "email")).toMatchObject({
			accountId: "user-2",
			email: "other@example.com"
		});
		const created = await userEntityStorage.get("user@example.com", "email");
		expect(created?.authProviderId).toBe(EntityStorageAuthenticationAdminService.AUTH_PROVIDER_ID);
		expect(created?.dateCreated).toEqual(expect.any(String));
		expect(created?.dateModified).toBe(created?.dateCreated);
		expect(created?.dateLastLogin).toBeUndefined();
	});

	it("should refuse to create a user whose e-mail address is in use with a conflict", async () => {
		await userEntityStorage.set({
			email: "user@example.com",
			password: "stored-password",
			salt: "AQIDBA==",
			authProviderId: "entity-storage",
			dateCreated: "2026-01-01T00:00:00.000Z",
			dateModified: "2026-01-01T00:00:00.000Z",
			accountId: "user-1"
		});
		vi.spyOn(PasswordValidator, "validatePassword").mockImplementation(() => {});

		const error = await service
			.create({
				email: " User@Example.com ",
				password: "correct-horse-battery"
			})
			.catch(err => err);
		expect(error).toMatchObject({
			name: "ConflictError",
			message: "entityStorageAuthenticationAdminService.userExists",
			properties: { conflictId: "user@example.com" }
		});
		expect(HttpErrorHelper.processError(error).httpStatusCode).toBe(HttpStatusCode.conflict);
		expect(await userEntityStorage.get("user@example.com", "email")).toMatchObject({
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
				password: "short"
			})
		).rejects.toThrow(GeneralError);
		expect(await userEntityStorage.get("user@example.com", "email")).toBeUndefined();
	});

	it("should get a user by email", async () => {
		await userEntityStorage.set({
			email: "user@example.com",
			password: "stored-password",
			salt: "AQIDBA==",
			authProviderId: "entity-storage",
			dateCreated: "2026-01-01T00:00:00.000Z",
			dateModified: "2026-01-01T00:00:00.000Z",
			accountId: "user-1"
		});

		const result = await service.get("user@example.com");

		expect(result).toEqual({
			email: "user@example.com",
			accountId: "user-1",
			authProviderId: "entity-storage",
			dateCreated: "2026-01-01T00:00:00.000Z",
			disabled: false,
			verified: true
		});
	});

	it("should get a user of any provider by email or account id", async () => {
		await userEntityStorage.set({
			email: "oauth@example.com",
			accountId: "user-2",
			authProviderId: "google",
			providerAccountId: "google-subject",
			dateCreated: "2026-01-01T00:00:00.000Z",
			dateModified: "2026-01-01T00:00:00.000Z"
		});

		expect(await service.get("oauth@example.com")).toEqual({
			email: "oauth@example.com",
			accountId: "user-2",
			authProviderId: "google",
			dateCreated: "2026-01-01T00:00:00.000Z",
			disabled: false,
			verified: true
		});
		expect(await service.get("user-2")).toMatchObject({ accountId: "user-2" });

		await service.remove("oauth@example.com");
		expect(await userEntityStorage.get("user-2")).toBeUndefined();
	});

	it("should prefer the password account when more than one provider holds the e-mail address", async () => {
		for (const [accountId, authProviderId] of [
			["user-1", "google"],
			["user-2", "entity-storage"]
		]) {
			await userEntityStorage.set({
				email: "shared@example.com",
				accountId,
				authProviderId,
				dateCreated: "2026-01-01T00:00:00.000Z",
				dateModified: "2026-01-01T00:00:00.000Z"
			});
		}

		expect(await service.get("shared@example.com")).toMatchObject({ accountId: "user-2" });
	});

	it("should ask for the account id when more than one other provider holds the e-mail address", async () => {
		for (const [accountId, authProviderId] of [
			["user-1", "google"],
			["user-2", "microsoft"]
		]) {
			await userEntityStorage.set({
				email: "shared@example.com",
				accountId,
				authProviderId,
				dateCreated: "2026-01-01T00:00:00.000Z",
				dateModified: "2026-01-01T00:00:00.000Z"
			});
		}

		await expect(service.remove("shared@example.com")).rejects.toMatchObject({
			name: "ConflictError",
			message: "entityStorageAuthenticationAdminService.multipleAccounts"
		});
		await service.remove("user-2");
		expect(await userEntityStorage.get("user-2")).toBeUndefined();
		expect(await userEntityStorage.get("user-1")).toBeDefined();
	});

	it("should find a user by e-mail address with one query and no account id lookup", async () => {
		for (const [accountId, authProviderId] of [
			["user-1", "google"],
			["user-2", "entity-storage"]
		]) {
			await userEntityStorage.set({
				email: "shared@example.com",
				accountId,
				authProviderId,
				dateCreated: "2026-01-01T00:00:00.000Z",
				dateModified: "2026-01-01T00:00:00.000Z"
			});
		}
		const getSpy = vi.spyOn(userEntityStorage, "get");
		const querySpy = vi.spyOn(userEntityStorage, "query");

		expect(await service.get("shared@example.com")).toMatchObject({ accountId: "user-2" });
		expect(getSpy).not.toHaveBeenCalled();
		expect(querySpy).toHaveBeenCalledTimes(1);
	});

	it("should find a password account beyond the accounts of other providers read at once", async () => {
		for (let i = 0; i < 10; i++) {
			await userEntityStorage.set({
				email: "shared@example.com",
				accountId: `user-${i}`,
				authProviderId: `provider-${i}`,
				dateCreated: "2026-01-01T00:00:00.000Z",
				dateModified: "2026-01-01T00:00:00.000Z"
			});
		}
		await userEntityStorage.set({
			email: "shared@example.com",
			accountId: "user-password",
			authProviderId: "entity-storage",
			dateCreated: "2026-01-01T00:00:00.000Z",
			dateModified: "2026-01-01T00:00:00.000Z"
		});

		expect(await service.get("shared@example.com")).toMatchObject({
			accountId: "user-password"
		});
	});

	it("should wrap get failures when the user is missing", async () => {
		await expect(service.get("missing@example.com")).rejects.toThrow(GeneralError);
	});

	it("should remove an existing user", async () => {
		await userEntityStorage.set({
			email: "user@example.com",
			password: "stored-password",
			salt: "AQIDBA==",
			authProviderId: "entity-storage",
			dateCreated: "2026-01-01T00:00:00.000Z",
			dateModified: "2026-01-01T00:00:00.000Z",
			accountId: "user-1"
		});

		await service.remove("user@example.com");

		expect(await userEntityStorage.get("user@example.com", "email")).toBeUndefined();
		expect(mockAuthenticationAuditService.create).toHaveBeenCalledWith({
			actorId: "user@example.com",
			event: "account-deleted",
			data: {
				accountId: "user-1",
				email: "user@example.com",
				actorAccountId: undefined,
				tenantId: undefined,
				originalTenantId: undefined
			}
		});
	});

	it("should wrap remove failures when the user is missing", async () => {
		const removeSpy = vi.spyOn(userEntityStorage, "remove");

		await expect(service.remove("missing@example.com")).rejects.toThrow(GeneralError);
		expect(removeSpy).not.toHaveBeenCalled();
	});

	it("should set the password without checking the current password", async () => {
		await userEntityStorage.set({
			email: "user@example.com",
			password: "stored-password",
			salt: "AQIDBA==",
			authProviderId: "entity-storage",
			dateCreated: "2026-01-01T00:00:00.000Z",
			dateModified: "2026-01-01T00:00:00.000Z",
			accountId: "user-1"
		});
		vi.spyOn(PasswordValidator, "validatePassword").mockImplementation(() => {});
		const verifySpy = vi.spyOn(PasswordHelper, "verifyPassword");
		vi.spyOn(PasswordHelper, "hashPassword").mockResolvedValue({
			...HASHED,
			password: "new-password-hash",
			salt: "BQYHCA=="
		});

		await service.updatePassword("user@example.com", "better-password-value");

		expect(verifySpy).not.toHaveBeenCalled();
		expect(await userEntityStorage.get("user@example.com", "email")).toEqual({
			email: "user@example.com",
			salt: "BQYHCA==",
			authProviderId: "entity-storage",
			dateCreated: "2026-01-01T00:00:00.000Z",
			dateModified: expect.not.stringMatching("2026-01-01T00:00:00.000Z"),
			password: "new-password-hash",
			passwordAlgorithm: "argon2id",
			passwordHashParameters: "t=2,m=19456,p=1",
			accountId: "user-1",
			passwordVersion: 1
		});
		expect(mockAuthenticationAuditService.create).toHaveBeenCalledWith({
			actorId: "user@example.com",
			event: "password-changed",
			data: {
				accountId: "user-1",
				email: "user@example.com",
				actorAccountId: undefined
			}
		});
	});

	it("should wrap updatePassword failures when the user is missing", async () => {
		vi.spyOn(PasswordValidator, "validatePassword").mockImplementation(() => {});

		await expect(
			service.updatePassword("missing@example.com", "better-password-value")
		).rejects.toThrow(GeneralError);
		expect(await userEntityStorage.get("missing@example.com", "email")).toBeUndefined();
	});

	it("should wrap updatePassword failures when the account has no password", async () => {
		await userEntityStorage.set({
			email: "user@example.com",
			accountId: "user-1",
			authProviderId: "google",
			providerAccountId: "google-subject-1",
			dateCreated: "2026-01-01T00:00:00.000Z",
			dateModified: "2026-01-01T00:00:00.000Z"
		});

		await expect(
			service.updatePassword("user@example.com", "better-password-value")
		).rejects.toThrow(GeneralError);
		expect((await userEntityStorage.get("user-1"))?.password).toBeUndefined();
	});

	it("should remove an account by its account id", async () => {
		await userEntityStorage.set({
			email: "user@example.com",
			password: "stored-password",
			salt: "AQIDBA==",
			accountId: "user-1",
			authProviderId: "entity-storage",
			dateCreated: "2026-01-01T00:00:00.000Z",
			dateModified: "2026-01-01T00:00:00.000Z"
		});

		await service.remove("user@example.com");

		expect(await userEntityStorage.get("user-1")).toBeUndefined();
	});

	it("should remove the account data and organization requests of a removed user", async () => {
		await userEntityStorage.set({
			email: "user@example.com",
			password: "stored-password",
			salt: "AQIDBA==",
			accountId: "user-1",
			authProviderId: "entity-storage",
			dateCreated: "2026-01-01T00:00:00.000Z",
			dateModified: "2026-01-01T00:00:00.000Z"
		});
		const items = [{ id: "item-1" }, { id: "item-2" }];
		const accountAdmin = {
			className: () => "AccountAdmin",
			query: vi.fn(async () => ({ entities: [...items] })),
			remove: vi.fn(async (id: string) => {
				items.splice(
					items.findIndex(item => item.id === id),
					1
				);
			})
		};
		const organizationRequestAdmin = {
			className: () => "OrganizationRequestAdmin",
			removeForAccount: vi.fn(async () => {})
		};
		vi.spyOn(ComponentFactory, "getIfExists").mockImplementation(componentName => {
			if (componentName === "authentication-account-admin") {
				return accountAdmin;
			}
			if (componentName === "organization-request-admin") {
				return organizationRequestAdmin;
			}
		});

		await service.remove("user@example.com");

		expect(organizationRequestAdmin.removeForAccount).toHaveBeenCalledWith("user-1");
		expect(accountAdmin.query).toHaveBeenCalledTimes(2);
		expect(accountAdmin.query).toHaveBeenCalledWith("user-1");
		expect(accountAdmin.remove).toHaveBeenCalledWith("item-1");
		expect(accountAdmin.remove).toHaveBeenCalledWith("item-2");
		expect(items).toHaveLength(0);
		expect(await userEntityStorage.get("user-1")).toBeUndefined();
	});

	describe("escalated privilege", () => {
		let escalatedAccounts: string[];
		let mockAuthorizationComponent: IAuthorizationComponent;
		let guardedService: EntityStorageAuthenticationAdminService;
		let queryCallers: (string | undefined)[];
		let createCallers: (string | undefined)[];
		let accountAdmin: {
			className: () => string;
			query: ReturnType<typeof vi.fn>;
			create: ReturnType<typeof vi.fn>;
			remove: ReturnType<typeof vi.fn>;
		};

		beforeEach(async () => {
			// Roles are held by account ids.
			escalatedAccounts = ["user-1", "admin-account"];
			mockAuthorizationComponent = {
				hasRoleForSubject: vi.fn(
					async (modelId: string, subject: string, role: string) =>
						role === "global-admin" && escalatedAccounts.includes(subject)
				),
				removeAllRolesForSubject: vi.fn()
			} as unknown as IAuthorizationComponent;
			// The account user-1 is in did:example:org-1, the account data query records its caller.
			queryCallers = [];
			createCallers = [];
			accountAdmin = {
				className: () => "AccountAdmin",
				query: vi.fn(async (accountId: string, type?: string) => {
					if (type !== "organization") {
						return { entities: [] };
					}
					queryCallers.push((await ContextIdStore.getContextIds())?.[ContextIdKeys.Account]);
					return {
						entities:
							accountId === "user-1"
								? [
										{
											id: "org-row",
											data: AuthenticationAccountHelper.createOrganizationData("did:example:org-1")
										}
									]
								: []
					};
				}),
				create: vi.fn(async () => {
					createCallers.push((await ContextIdStore.getContextIds())?.[ContextIdKeys.Account]);
					return "org-row";
				}),
				remove: vi.fn(async () => {})
			};
			vi.spyOn(ComponentFactory, "getIfExists").mockImplementation(componentName => {
				if (componentName === "authorization") {
					return mockAuthorizationComponent;
				}
				if (componentName === "authentication-account-admin") {
					return accountAdmin;
				}
				if (componentName === "authentication-audit") {
					return mockAuthenticationAuditService;
				}
				return undefined;
			});
			guardedService = new EntityStorageAuthenticationAdminService();

			await userEntityStorage.set({
				email: "admin@example.com",
				password: "stored-password",
				salt: "AQIDBA==",
				accountId: "user-1",
				authProviderId: "entity-storage",
				providerAccountId: "admin@example.com",
				dateCreated: "2026-01-01T00:00:00.000Z",
				dateModified: "2026-01-01T00:00:00.000Z"
			});
		});

		it("should forbid removing or resetting an escalated account when the caller is not escalated", async () => {
			await ContextIdStore.run(
				{
					[ContextIdKeys.Account]: "user-admin-account",
					[ContextIdKeys.UserOrganization]: "did:example:org-1"
				},
				async () => {
					await expect(guardedService.remove("admin@example.com")).rejects.toMatchObject({
						name: "ForbiddenError",
						message: "entityStorageAuthenticationAdminService.insufficientRoleForEscalatedTarget"
					});
					await expect(
						guardedService.updatePassword("admin@example.com", "new-password-123456")
					).rejects.toMatchObject({ name: "ForbiddenError" });
				}
			);

			expect(await userEntityStorage.get("user-1")).toMatchObject({ password: "stored-password" });
		});

		it("should allow an escalated caller to modify an escalated account", async () => {
			await ContextIdStore.run({ [ContextIdKeys.Account]: "admin-account" }, async () => {
				await guardedService.remove("admin@example.com");
			});

			expect(await userEntityStorage.get("user-1")).toBeUndefined();
		});

		it("should treat a call with no caller account as the system", async () => {
			await guardedService.remove("admin@example.com");

			expect(await userEntityStorage.get("user-1")).toBeUndefined();
			// The roles of the account are removed with it.
			expect(mockAuthorizationComponent.removeAllRolesForSubject).toHaveBeenCalledWith(
				"system",
				"user-1"
			);
		});

		it("should not treat a DID with the role as escalated", async () => {
			await ContextIdStore.run(
				{
					[ContextIdKeys.Account]: "user-admin-account",
					[ContextIdKeys.User]: "admin-account",
					[ContextIdKeys.UserOrganization]: "did:example:org-1"
				},
				async () => {
					await expect(guardedService.remove("admin@example.com")).rejects.toMatchObject({
						name: "ForbiddenError"
					});
				}
			);
		});

		it("should let a caller without escalated privilege manage any account of the tenant", async () => {
			escalatedAccounts = ["admin-account"];

			for (const organization of ["did:example:org-2", undefined]) {
				await ContextIdStore.run(
					{
						[ContextIdKeys.Account]: "user-admin-account",
						[ContextIdKeys.UserOrganization]: organization
					},
					async () => {
						await expect(guardedService.get("admin@example.com")).resolves.toMatchObject({
							accountId: "user-1"
						});
					}
				);
			}

			await ContextIdStore.run(
				{
					[ContextIdKeys.Account]: "user-admin-account",
					[ContextIdKeys.UserOrganization]: "did:example:org-2"
				},
				async () => {
					await guardedService.disable("admin@example.com");
					await guardedService.enable("admin@example.com");
					await guardedService.updatePassword("admin@example.com", "New-Password-123456");
					await guardedService.remove("admin@example.com");
				}
			);

			expect(await userEntityStorage.get("user-1")).toBeUndefined();
			// The organization is only read to return it with the user.
			expect(queryCallers).toEqual(["user-admin-account", "user-admin-account"]);
		});

		it("should forbid disabling or enabling an escalated account when the caller is not escalated", async () => {
			await ContextIdStore.run({ [ContextIdKeys.Account]: "user-admin-account" }, async () => {
				await expect(guardedService.disable("admin@example.com")).rejects.toMatchObject({
					name: "ForbiddenError"
				});
				await expect(guardedService.enable("admin@example.com")).rejects.toMatchObject({
					name: "ForbiddenError"
				});
			});
			expect((await userEntityStorage.get("user-1"))?.dateDisabled).toBeUndefined();
		});

		it("should not add an account created by a caller to an organization", async () => {
			vi.spyOn(RandomHelper, "generateUuidV7").mockReturnValue("user-3");

			for (const account of ["user-admin-account", "admin-account"]) {
				await userEntityStorage.remove("user-3");
				await ContextIdStore.run({ [ContextIdKeys.Account]: account }, async () =>
					guardedService.create({ email: "new@example.com", password: "Correct-Horse-Battery-42" })
				);
				expect(await userEntityStorage.get("user-3")).toBeDefined();
			}

			expect(accountAdmin.create).not.toHaveBeenCalled();
			expect(createCallers).toEqual([]);
		});

		it("should record the caller as the actor of an admin action", async () => {
			escalatedAccounts = [];

			await ContextIdStore.run({ [ContextIdKeys.Account]: "user-admin-account" }, async () =>
				guardedService.disable("admin@example.com")
			);

			expect(mockAuthenticationAuditService.create).toHaveBeenCalledWith({
				actorId: "user-admin-account",
				event: "account-locked",
				data: expect.objectContaining({
					accountId: "user-1",
					email: "admin@example.com",
					actorAccountId: "user-admin-account"
				})
			});
		});
	});

	describe("identity and organization", () => {
		let items: IAuthenticationAccountData[];
		let escalatedAccounts: string[];
		let accountAdmin: IAuthenticationAccountAdminComponent;

		beforeEach(async () => {
			escalatedAccounts = ["admin-account"];
			items = [
				{
					id: AuthenticationAccountHelper.identityItemId("did:example:old"),
					accountId: "user-1",
					type: "identity",
					data: AuthenticationAccountHelper.createIdentityData("did:example:old"),
					isDefault: true,
					dateCreated: "2026-01-01T00:00:00.000Z",
					dateModified: "2026-01-01T00:00:00.000Z"
				},
				{
					id: "org-1",
					accountId: "user-1",
					type: "organization",
					data: AuthenticationAccountHelper.createOrganizationData("did:example:org-1"),
					isDefault: true,
					dateCreated: "2026-01-01T00:00:00.000Z",
					dateModified: "2026-01-01T00:00:00.000Z"
				}
			];
			// Like the account data admin service, a caller without escalated privilege may not change
			// the identity or organization of their own account, and needs a proof to bind an identity.
			async function guard(accountId: string, type: string, creating: boolean): Promise<void> {
				const caller = (await ContextIdStore.getContextIds())?.[ContextIdKeys.Account];
				if (Is.stringValue(caller) && !escalatedAccounts.includes(caller)) {
					if (caller === accountId) {
						throw new ForbiddenError("AccountAdmin", "ownAccountNotPermitted");
					}
					if (creating && type === "identity") {
						throw new UnauthorizedError("AccountAdmin", "identityProofRequired");
					}
				}
			}
			accountAdmin = {
				className: () => "AccountAdmin",
				query: vi.fn(async (accountId?: string, type?: string, cursor?: string) => {
					const matched = items.filter(
						item =>
							(!Is.stringValue(accountId) || item.accountId === accountId) &&
							(!Is.stringValue(type) || item.type === type)
					);
					// One item a page, so a query has to follow the cursor.
					const index = Number(cursor ?? "0");
					return {
						entities: matched.slice(index, index + 1),
						cursor: index + 1 < matched.length ? String(index + 1) : undefined
					};
				}),
				create: vi.fn(
					async (accountId: string, type: string, data: unknown, isDefault?: boolean) => {
						await guard(accountId, type, true);
						// Like the account data service, the id of an identity item is derived from its DID.
						const id =
							type === "identity"
								? AuthenticationAccountHelper.identityItemId(
										AuthenticationAccountHelper.getIdentity(data) ?? ""
									)
								: `${type}-${items.length + 1}`;
						for (const item of items) {
							if (isDefault === true && item.accountId === accountId && item.type === type) {
								item.isDefault = false;
							}
						}
						items.push({
							id,
							accountId,
							type,
							data,
							isDefault: isDefault ?? false,
							dateCreated: "2026-01-02T00:00:00.000Z",
							dateModified: "2026-01-02T00:00:00.000Z"
						});
						return id;
					}
				),
				get: vi.fn(async (id: string) => {
					const item = items.find(i => i.id === id);
					if (!Is.object(item)) {
						throw new NotFoundError("AccountAdmin", "itemNotFound", id);
					}
					return item;
				}),
				update: vi.fn(),
				remove: vi.fn(async (id: string) => {
					const item = items.find(i => i.id === id);
					await guard(item?.accountId ?? "", item?.type ?? "", false);
					items = items.filter(i => i.id !== id);
				}),
				createIdentity: vi.fn(),
				exportIdentity: vi.fn(),
				importIdentity: vi.fn(),
				exportProfile: vi.fn(),
				importProfile: vi.fn()
			};
			const authorization = {
				className: () => "authorization",
				hasRoleForSubject: vi.fn(
					async (modelId: string, subject: string, role: string) =>
						role === "global-admin" && escalatedAccounts.includes(subject)
				)
			};
			vi.spyOn(ComponentFactory, "getIfExists").mockImplementation(componentName => {
				if (componentName === "authentication-account-admin") {
					return accountAdmin;
				}
				if (componentName === "authorization") {
					return authorization;
				}
				if (componentName === "authentication-audit") {
					return mockAuthenticationAuditService;
				}
				return undefined;
			});
			service = new EntityStorageAuthenticationAdminService();

			for (const [accountId, email] of [
				["user-1", "user@example.com"],
				["user-2", "other@example.com"]
			]) {
				await userEntityStorage.set({
					email,
					accountId,
					authProviderId: "entity-storage",
					providerAccountId: email,
					dateCreated: "2026-01-01T00:00:00.000Z",
					dateModified: "2026-01-01T00:00:00.000Z"
				});
			}
			items.push({
				id: AuthenticationAccountHelper.identityItemId("did:example:other"),
				accountId: "user-2",
				type: "identity",
				data: AuthenticationAccountHelper.createIdentityData("did:example:other"),
				isDefault: true,
				dateCreated: "2026-01-01T00:00:00.000Z",
				dateModified: "2026-01-01T00:00:00.000Z"
			});
		});

		it("should get a user with its identity and organization", async () => {
			await expect(service.get("user@example.com")).resolves.toMatchObject({
				accountId: "user-1",
				userIdentity: "did:example:old",
				organizationIdentity: "did:example:org-1"
			});
		});

		it("should get the user whose identity is the DID", async () => {
			await expect(service.getByIdentity("did:example:other")).resolves.toMatchObject({
				accountId: "user-2",
				email: "other@example.com",
				userIdentity: "did:example:other"
			});
			await expect(service.getByIdentity("did:example:old")).resolves.toMatchObject({
				accountId: "user-1",
				organizationIdentity: "did:example:org-1"
			});
		});

		it("should fail to get a user by an identity no account holds", async () => {
			const error = await service.getByIdentity("did:example:missing").catch(e => e);

			expect(error).toMatchObject({
				name: GeneralError.CLASS_NAME,
				message: "entityStorageAuthenticationAdminService.getUserFailed"
			});
			expect(error.cause).toMatchObject({ name: "NotFoundError" });
		});

		it("should replace the identity and set the default organization", async () => {
			await ContextIdStore.run({ [ContextIdKeys.Account]: "admin-account" }, async () =>
				service.update({
					email: "user@example.com",
					userIdentity: "did:example:new",
					organizationIdentity: "did:example:org-2"
				})
			);

			await expect(service.get("user-1")).resolves.toMatchObject({
				userIdentity: "did:example:new",
				organizationIdentity: "did:example:org-2"
			});
			expect(items.filter(i => i.accountId === "user-1" && i.type === "identity")).toHaveLength(1);
			// The account data is stored in its JSON-LD shape, the user still holds the DIDs.
			expect(accountAdmin.create).toHaveBeenCalledWith(
				"user-1",
				"identity",
				{ "@context": "https://www.w3.org/ns/did/v1", id: "did:example:new" },
				true
			);
			expect(accountAdmin.create).toHaveBeenCalledWith(
				"user-1",
				"organization",
				{
					"@context": "https://schema.org",
					"@type": "Organization",
					identifier: "did:example:org-2"
				},
				true
			);
			expect(mockAuthenticationAuditService.create).toHaveBeenCalledWith(
				expect.objectContaining({
					actorId: "admin-account",
					event: "account-updated",
					data: expect.objectContaining({
						updatedFields: ["userIdentity", "organizationIdentity"],
						accountId: "user-1"
					})
				})
			);
		});

		it("should change nothing when the values are unchanged", async () => {
			await service.update({
				email: "user@example.com",
				userIdentity: "did:example:old",
				organizationIdentity: "did:example:org-1"
			});

			expect(accountAdmin.create).not.toHaveBeenCalled();
			expect(accountAdmin.remove).not.toHaveBeenCalled();
			expect(mockAuthenticationAuditService.create).not.toHaveBeenCalled();
		});

		it("should forbid a caller without escalated privilege updating an escalated account", async () => {
			escalatedAccounts = ["admin-account", "user-1"];

			await expect(
				ContextIdStore.run({ [ContextIdKeys.Account]: "user-admin-account" }, async () =>
					service.update({ email: "user@example.com", organizationIdentity: "did:example:org-2" })
				)
			).rejects.toMatchObject({
				name: "ForbiddenError",
				message: "entityStorageAuthenticationAdminService.insufficientRoleForEscalatedTarget"
			});
			expect(accountAdmin.create).not.toHaveBeenCalled();
		});

		it("should forbid a caller without escalated privilege changing their own identity", async () => {
			await expect(
				ContextIdStore.run({ [ContextIdKeys.Account]: "user-1" }, async () =>
					service.update({ email: "user@example.com", organizationIdentity: "did:example:org-2" })
				)
			).rejects.toMatchObject({ name: "ForbiddenError" });
			await expect(
				ContextIdStore.run({ [ContextIdKeys.Account]: "user-1" }, async () =>
					service.update({ email: "user@example.com", userIdentity: "did:example:new" })
				)
			).rejects.toMatchObject({ name: "ForbiddenError" });

			await expect(service.get("user-1")).resolves.toMatchObject({
				userIdentity: "did:example:old",
				organizationIdentity: "did:example:org-1"
			});
		});

		it("should put the identity back when the new one cannot be stored", async () => {
			const error = await ContextIdStore.run(
				{ [ContextIdKeys.Account]: "user-admin-account" },
				async () => service.update({ email: "user@example.com", userIdentity: "did:example:new" })
			).catch(e => e);

			expect(error).toMatchObject({
				name: GeneralError.CLASS_NAME,
				message: "entityStorageAuthenticationAdminService.updateUserFailed"
			});
			await expect(service.get("user-1")).resolves.toMatchObject({
				userIdentity: "did:example:old"
			});
		});

		it("should fail to update the identity without the account data component", async () => {
			vi.spyOn(ComponentFactory, "getIfExists").mockReturnValue(undefined);

			await expect(
				service.update({ email: "user@example.com", userIdentity: "did:example:new" })
			).rejects.toMatchObject({
				message: "entityStorageAuthenticationAdminService.updateUserFailed",
				cause: expect.objectContaining({
					message: "entityStorageAuthenticationAdminService.accountAdminMissing"
				})
			});
		});
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
			vi.spyOn(PasswordHelper, "hashPassword").mockResolvedValue(HASHED);

			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_A }, async () => {
				await service.create({
					email: "user@example.com",
					password: "correct-horse-battery"
				});

				expect(await userEntityStorage.get("user@example.com", "email")).toEqual({
					email: "user@example.com",
					salt: "AQIDBA==",
					authProviderId: "entity-storage",
					providerAccountId: "user@example.com",
					dateCreated: expect.any(String),
					dateModified: expect.any(String),
					password: "hashed-password",
					passwordAlgorithm: "argon2id",
					passwordHashParameters: "t=2,m=19456,p=1",
					accountId: "user-1",
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
					authProviderId: "entity-storage",
					dateCreated: "2026-01-01T00:00:00.000Z",
					dateModified: "2026-01-01T00:00:00.000Z",
					accountId: "user-1"
				});

				const result = await service.get("user@example.com");

				expect(result).toEqual({
					email: "user@example.com",
					accountId: "user-1",
					authProviderId: "entity-storage",
					dateCreated: "2026-01-01T00:00:00.000Z",
					disabled: false,
					verified: true
				});
			});
		});

		it("should remove a user within a tenant", async () => {
			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_A }, async () => {
				await userEntityStorage.set({
					email: "user@example.com",
					password: "stored-password",
					salt: "AQIDBA==",
					authProviderId: "entity-storage",
					dateCreated: "2026-01-01T00:00:00.000Z",
					dateModified: "2026-01-01T00:00:00.000Z",
					accountId: "user-1"
				});

				await service.remove("user@example.com");

				expect(await userEntityStorage.get("user@example.com", "email")).toBeUndefined();
			});
		});

		it("should update the password within a tenant", async () => {
			vi.spyOn(PasswordValidator, "validatePassword").mockImplementation(() => {});
			vi.spyOn(PasswordHelper, "hashPassword").mockResolvedValue({
				...HASHED,
				password: "new-password-hash"
			});

			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_A }, async () => {
				await userEntityStorage.set({
					email: "user@example.com",
					password: "stored-password",
					salt: "AQIDBA==",
					authProviderId: "entity-storage",
					dateCreated: "2026-01-01T00:00:00.000Z",
					dateModified: "2026-01-01T00:00:00.000Z",
					accountId: "user-1"
				});

				await service.updatePassword("user@example.com", "better-password-value");

				expect(await userEntityStorage.get("user@example.com", "email")).toMatchObject({
					password: "new-password-hash"
				});
			});
		});

		it("should allow the same email to be created in different tenants", async () => {
			vi.spyOn(PasswordValidator, "validatePassword").mockImplementation(() => {});
			vi.spyOn(PasswordHelper, "hashPassword").mockResolvedValue(HASHED);
			vi.spyOn(RandomHelper, "generateUuidV7")
				.mockReturnValueOnce("account-a")
				.mockReturnValueOnce("account-b");

			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_A }, async () => {
				await service.create({
					email: "user@example.com",
					password: "correct-horse-battery"
				});
			});

			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_B }, async () => {
				await service.create({
					email: "user@example.com",
					password: "correct-horse-battery"
				});
			});

			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_A }, async () => {
				const userA = await service.get("user@example.com");
				expect(userA).toMatchObject({ accountId: "account-a" });
			});

			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_B }, async () => {
				const userB = await service.get("user@example.com");
				expect(userB).toMatchObject({ accountId: "account-b" });
			});
		});

		it("should isolate users between tenants", async () => {
			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_A }, async () => {
				await userEntityStorage.set({
					email: "user@example.com",
					password: "stored-password",
					salt: "AQIDBA==",
					authProviderId: "entity-storage",
					dateCreated: "2026-01-01T00:00:00.000Z",
					dateModified: "2026-01-01T00:00:00.000Z",
					accountId: "user-1"
				});
			});

			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_B }, async () => {
				await expect(service.get("user@example.com")).rejects.toThrow(GeneralError);
			});
		});

		it("should not remove a user from a different tenant", async () => {
			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_A }, async () => {
				await userEntityStorage.set({
					email: "user@example.com",
					password: "stored-password",
					salt: "AQIDBA==",
					authProviderId: "entity-storage",
					dateCreated: "2026-01-01T00:00:00.000Z",
					dateModified: "2026-01-01T00:00:00.000Z",
					accountId: "user-1"
				});
			});

			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_B }, async () => {
				await expect(service.remove("user@example.com")).rejects.toThrow(GeneralError);
			});

			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_A }, async () => {
				expect(await userEntityStorage.get("user@example.com", "email")).toBeDefined();
			});
		});

		it("should not update the password for a user from a different tenant", async () => {
			vi.spyOn(PasswordValidator, "validatePassword").mockImplementation(() => {});

			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_A }, async () => {
				await userEntityStorage.set({
					email: "user@example.com",
					password: "stored-password",
					salt: "AQIDBA==",
					authProviderId: "entity-storage",
					dateCreated: "2026-01-01T00:00:00.000Z",
					dateModified: "2026-01-01T00:00:00.000Z",
					accountId: "user-1"
				});
			});

			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_B }, async () => {
				await expect(
					service.updatePassword("user@example.com", "better-password-value")
				).rejects.toThrow(GeneralError);
			});

			await ContextIdStore.run({ [ContextIdKeys.Tenant]: TENANT_A }, async () => {
				expect(await userEntityStorage.get("user@example.com", "email")).toMatchObject({
					password: "stored-password"
				});
			});
		});
	});
});
