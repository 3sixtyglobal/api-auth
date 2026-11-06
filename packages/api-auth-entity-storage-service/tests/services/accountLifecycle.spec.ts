// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import {
	AuthenticationProviderFactory,
	type IAuthenticationAccountAdminComponent,
	type IAuthenticationAccountComponent,
	type IAuthenticationAuditComponent,
	type IAuthenticationRateComponent,
	type IOrganizationRequestAdminComponent
} from "@3sixty/api-auth-models";
import { ForbiddenError, HttpContextIdKeys, HttpErrorHelper } from "@3sixty/api-models";
import type { IAuthorizationComponent } from "@3sixty/authorization-models";
import { ContextIdKeys, ContextIdStore, type IContextIds } from "@3sixty/context";
import {
	ComponentFactory,
	Converter,
	DurationConstants,
	GeneralError,
	NotFoundError,
	UnauthorizedError
} from "@3sixty/core";
import { PasswordGenerator, Sha256 } from "@3sixty/crypto";
import { MemoryEntityStorageConnector } from "@3sixty/entity-storage-connector-memory";
import { EntityStorageConnectorFactory } from "@3sixty/entity-storage-models";
import type { ILoggingComponent } from "@3sixty/logging-models";
import type { IMessagingComponent } from "@3sixty/messaging-models";
import { nameof } from "@3sixty/nameof";
import { type IVaultConnector, VaultConnectorFactory } from "@3sixty/vault-models";
import { HttpStatusCode } from "@3sixty/web";
import type { AuthenticationAuthorizationCode } from "../../src/entities/authenticationAuthorizationCode.js";
import type { AuthenticationPasswordReset } from "../../src/entities/authenticationPasswordReset.js";
import type { AuthenticationUser } from "../../src/entities/authenticationUser.js";
import type { IEntityStorageAuthenticationServiceConfig } from "../../src/models/IEntityStorageAuthenticationServiceConfig.js";
import type { IEntityStorageAuthenticationServiceConstructorOptions } from "../../src/models/IEntityStorageAuthenticationServiceConstructorOptions.js";
import { initSchema } from "../../src/schema.js";
import { EntityStorageAuthenticationAdminService } from "../../src/services/entityStorageAuthenticationAdminService.js";
import { EntityStorageAuthenticationService } from "../../src/services/entityStorageAuthenticationService.js";
import { AccountHelper } from "../../src/utils/accountHelper.js";
import { AuthTokenCache } from "../../src/utils/authTokenCache.js";
import { PasswordHelper } from "../../src/utils/passwordHelper.js";
import { PasswordResetHelper } from "../../src/utils/passwordResetHelper.js";
import { TokenHelper } from "../../src/utils/tokenHelper.js";
import { registerTestPasswordProvider } from "../helpers/testPasswordProvider.js";

initSchema();
registerTestPasswordProvider();

const PASSWORD = "Correct-Horse-Battery-Staple-1";
const NEW_PASSWORD = "Another-Horse-Battery-Staple-2";
const NODE_CONTEXT: IContextIds = { [ContextIdKeys.Node]: "node-1" };

describe("account lifecycle", () => {
	let userStorage: MemoryEntityStorageConnector<AuthenticationUser>;
	let resetStorage: MemoryEntityStorageConnector<AuthenticationPasswordReset>;
	let codeStorage: MemoryEntityStorageConnector<AuthenticationAuthorizationCode>;
	let rate: IAuthenticationRateComponent;
	let audit: IAuthenticationAuditComponent;
	let messaging: IMessagingComponent;
	let logging: ILoggingComponent;
	let components: { [name: string]: unknown };
	let scheduledTasks: { [id: string]: () => Promise<void> };

	function createService(
		config?: Omit<IEntityStorageAuthenticationServiceConstructorOptions, "config"> & {
			config?: Partial<IEntityStorageAuthenticationServiceConfig>;
		}
	): EntityStorageAuthenticationService {
		return new EntityStorageAuthenticationService({
			...config,
			config: {
				passwordResetUrl: "https://app.example.com/reset?lang=en",
				registrationVerificationUrl: "https://app.example.com/verify",
				emailSender: "no-reply@example.com",
				minPasswordLength: 10,
				...config?.config
			}
		});
	}

	async function createUser(email: string, accountId: string): Promise<AuthenticationUser> {
		return PasswordHelper.createUser(userStorage, "3sixty", accountId, email, PASSWORD);
	}

	async function runDeliveries(): Promise<void> {
		for (const [id, callback] of Object.entries(scheduledTasks)) {
			if (id.startsWith("authentication-delivery-")) {
				await callback();
			}
		}
	}

	beforeEach(() => {
		userStorage = new MemoryEntityStorageConnector<AuthenticationUser>({
			entitySchema: nameof<AuthenticationUser>(),
			config: { storageKey: "lifecycle-user" }
		});
		resetStorage = new MemoryEntityStorageConnector<AuthenticationPasswordReset>({
			entitySchema: nameof<AuthenticationPasswordReset>(),
			config: { storageKey: "lifecycle-password-reset" }
		});
		EntityStorageConnectorFactory.register("authentication-user", () => userStorage);
		codeStorage = new MemoryEntityStorageConnector<AuthenticationAuthorizationCode>({
			entitySchema: nameof<AuthenticationAuthorizationCode>(),
			config: { storageKey: "lifecycle-authorization-code" }
		});
		EntityStorageConnectorFactory.register("authentication-password-reset", () => resetStorage);
		EntityStorageConnectorFactory.register("authentication-authorization-code", () => codeStorage);
		VaultConnectorFactory.register("vault", () => ({}) as unknown as IVaultConnector);

		rate = {
			className: () => "rate",
			start: vi.fn(),
			stop: vi.fn(),
			registerAction: vi.fn(),
			unregisterAction: vi.fn(),
			check: vi.fn(),
			clear: vi.fn()
		};
		audit = {
			className: () => "audit",
			create: vi.fn(),
			get: vi.fn(),
			update: vi.fn(),
			remove: vi.fn(),
			query: vi.fn()
		};
		messaging = {
			className: () => "messaging",
			sendCustomEmail: vi.fn().mockResolvedValue(true)
		} as unknown as IMessagingComponent;
		logging = {
			className: () => "logging",
			log: vi.fn(),
			query: vi.fn()
		};

		scheduledTasks = {};
		components = {
			"authentication-rate": rate,
			"authentication-audit": audit,
			authorization: {
				className: () => "authorization",
				addRoleForSubject: vi.fn(),
				getRolesForSubject: vi.fn().mockResolvedValue(["user"]),
				hasRoleForSubject: vi.fn().mockResolvedValue(false),
				removeAllRolesForSubject: vi.fn()
			},
			"authentication-account": {
				className: () => "account",
				removeIdentity: vi.fn()
			},
			"authentication-account-admin": {
				className: () => "account-admin",
				getManagedAccounts: vi.fn().mockResolvedValue(undefined),
				query: vi.fn().mockResolvedValue({ entities: [] }),
				create: vi.fn(),
				update: vi.fn(),
				remove: vi.fn()
			},
			"organization-request-admin": {
				className: () => "organization-request-admin",
				removeForAccount: vi.fn()
			},
			"task-scheduler": {
				className: () => "scheduler",
				addTask: vi.fn(async (id: string, times: unknown, callback: () => Promise<void>) => {
					scheduledTasks[id] = callback;
				}),
				removeTask: vi.fn(),
				tasksInfo: vi.fn()
			},
			platform: {
				className: () => "platform",
				execute: vi.fn(async (method: () => Promise<void>) => method())
			},
			messaging,
			logging
		};
		for (const [name, component] of Object.entries(components)) {
			ComponentFactory.register(name, () => component as never);
		}
		vi.spyOn(TokenHelper, "createToken").mockResolvedValue({ token: "jwt", expiry: 1 });
	});

	afterEach(async () => {
		for (const name of Object.keys(components)) {
			ComponentFactory.unregister(name);
		}
		EntityStorageConnectorFactory.unregister("authentication-user");
		EntityStorageConnectorFactory.unregister("authentication-password-reset");
		EntityStorageConnectorFactory.unregister("authentication-authorization-code");
		VaultConnectorFactory.unregister("vault");
		await userStorage.teardown();
		await resetStorage.teardown();
		await codeStorage.teardown();
		vi.restoreAllMocks();
	});

	describe("forgotPassword", () => {
		test("e-mails a reset link and stores only the hash of the token", async () => {
			await createUser("user@example.com", "user-1");
			const service = createService();

			await ContextIdStore.run(NODE_CONTEXT, async () =>
				service.forgotPassword("user@example.com")
			);
			// The e-mail is sent after the response, by the queued work.
			expect(messaging.sendCustomEmail).not.toHaveBeenCalled();
			await service.stop();

			expect(messaging.sendCustomEmail).toHaveBeenCalledTimes(1);
			const [sender, recipients, templateId, data, locale] = vi.mocked(messaging.sendCustomEmail)
				.mock.calls[0];
			expect(sender).toBe("no-reply@example.com");
			expect(recipients).toEqual(["user@example.com"]);
			expect(templateId).toBe("password-reset");
			expect(locale).toBe("en");
			expect(data.expiryMinutes).toBe("30");
			const resetUrl = new URL(data.resetUrl);
			expect(resetUrl.searchParams.get("lang")).toBe("en");
			const token = resetUrl.searchParams.get("token") ?? "";
			expect(token.length).toBeGreaterThan(20);

			const stored = await resetStorage.query();
			expect(stored.entities).toHaveLength(1);
			expect(stored.entities[0].id).toBe(
				Converter.bytesToHex(Sha256.sum256(Converter.utf8ToBytes(token)))
			);
			expect(stored.entities[0].accountId).toBe("user-1");
			expect(stored.entities[0].expires).toBe(data.expires);
		});

		test("completes without an e-mail when no password account uses the address", async () => {
			const service = createService();

			await expect(service.forgotPassword("missing@example.com")).resolves.toBeUndefined();
			await service.stop();

			expect(messaging.sendCustomEmail).not.toHaveBeenCalled();
			expect((await resetStorage.query()).entities).toHaveLength(0);
		});

		test("gives the company name to the e-mail template", async () => {
			await createUser("user@example.com", "user-1");
			const service = createService({ config: { emailCompanyName: "Example Ltd" } });

			await ContextIdStore.run(NODE_CONTEXT, async () =>
				service.forgotPassword("user@example.com")
			);
			await service.stop();

			expect(vi.mocked(messaging.sendCustomEmail).mock.calls[0][3]).toMatchObject({
				companyName: "Example Ltd",
				expiryMinutes: "30"
			});
		});

		test("e-mails in the language the request prefers, from the queued work", async () => {
			await createUser("user@example.com", "user-1");
			const service = createService({ config: { emailLocale: "fr" } });

			await ContextIdStore.run(
				{ ...NODE_CONTEXT, [HttpContextIdKeys.Language]: "de-CH" },
				async () => service.forgotPassword("user@example.com")
			);
			await service.stop();

			expect(vi.mocked(messaging.sendCustomEmail).mock.calls[0][4]).toBe("de-CH");
		});

		test("e-mails in the e-mail locale when the request prefers no language", async () => {
			await createUser("user@example.com", "user-1");
			const service = createService({ config: { emailLocale: "fr" } });

			await ContextIdStore.run(NODE_CONTEXT, async () =>
				service.forgotPassword("user@example.com")
			);
			await service.stop();

			expect(vi.mocked(messaging.sendCustomEmail).mock.calls[0][4]).toBe("fr");
		});

		test("keeps only the latest token of an account", async () => {
			await createUser("user@example.com", "user-1");
			const service = createService();

			await service.forgotPassword("user@example.com");
			await service.forgotPassword("user@example.com");
			await service.stop();

			expect((await resetStorage.query()).entities).toHaveLength(1);
		});

		test("does not send a link to a disabled account", async () => {
			const user = await createUser("user@example.com", "user-1");
			await userStorage.set({ ...user, dateDisabled: new Date().toISOString() });
			const service = createService();

			await service.forgotPassword("user@example.com");
			await service.stop();

			expect(messaging.sendCustomEmail).not.toHaveBeenCalled();
		});

		test("fails to construct without messaging, sender or addresses", async () => {
			expect(() => createService({ config: { emailSender: undefined } })).toThrow("guard.string");
			expect(() => createService({ config: { passwordResetUrl: undefined } })).toThrow(
				"guard.string"
			);
			expect(() => createService({ config: { registrationVerificationUrl: undefined } })).toThrow(
				"guard.string"
			);

			ComponentFactory.unregister("messaging");
			delete components.messaging;
			expect(() => createService()).toThrow();
		});

		test("logs and completes when the e-mail cannot be sent", async () => {
			await createUser("user@example.com", "user-1");
			vi.mocked(messaging.sendCustomEmail).mockRejectedValue(new Error("smtp down"));
			const service = createService();

			await expect(service.forgotPassword("user@example.com")).resolves.toBeUndefined();
			await service.stop();

			expect(logging.log).toHaveBeenCalledWith(
				expect.objectContaining({ level: "warn", message: "passwordResetEmailFailed" })
			);
		});

		test("rate limits by e-mail address and by client address", async () => {
			const service = createService({ config: { clientAddressRateLimitEnabled: true } });

			await ContextIdStore.run({ [HttpContextIdKeys.IpAddress]: "10.0.0.1" }, async () =>
				service.forgotPassword("user@example.com")
			);

			expect(rate.check).toHaveBeenCalledWith("password-forgot", "user@example.com");
			expect(rate.check).toHaveBeenCalledWith(
				"password-forgot",
				expect.stringMatching(/^ip-[\da-f]{64}$/)
			);
		});

		test("rate limits by e-mail address only when the client address is not trusted", async () => {
			const service = createService();

			await ContextIdStore.run({ [HttpContextIdKeys.IpAddress]: "10.0.0.1" }, async () =>
				service.forgotPassword("user@example.com")
			);

			expect(vi.mocked(rate.check).mock.calls).toEqual([["password-forgot", "user@example.com"]]);
		});
	});

	describe("resetPassword", () => {
		test("sets the new password, ends the sessions and uses up the token", async () => {
			await createUser("user@example.com", "user-1");
			const service = createService();
			const { token } = await PasswordResetHelper.create(resetStorage, "user-1", 30);

			await service.resetPassword(token, NEW_PASSWORD);

			const user = await userStorage.get("user-1");
			expect(user?.passwordVersion).toBe(1);
			expect((await resetStorage.query()).entities).toHaveLength(0);
			expect(audit.create).toHaveBeenCalledWith({
				actorId: "user@example.com",
				event: "password-changed",
				data: { accountId: "user-1", email: "user@example.com", actorAccountId: undefined }
			});

			await expect(service.resetPassword(token, NEW_PASSWORD)).rejects.toMatchObject({
				name: UnauthorizedError.CLASS_NAME
			});

			await ContextIdStore.run(NODE_CONTEXT, async () => service.start());
			await expect(service.login("user@example.com", NEW_PASSWORD)).resolves.toMatchObject({
				accountId: "user-1"
			});
		});

		test("refuses an unknown token", async () => {
			const service = createService();

			await expect(service.resetPassword("unknown", NEW_PASSWORD)).rejects.toMatchObject({
				name: UnauthorizedError.CLASS_NAME,
				message: "entityStorageAuthenticationService.passwordResetInvalid"
			});
		});

		test("refuses and removes an expired token", async () => {
			await createUser("user@example.com", "user-1");
			const service = createService();
			const { token } = await PasswordResetHelper.create(resetStorage, "user-1", 30);
			const stored = await resetStorage.get(PasswordResetHelper.hashToken(token));
			await resetStorage.set({
				...(stored as AuthenticationPasswordReset),
				expires: new Date(Date.now() - DurationConstants.MsPerSecond).toISOString()
			});

			await expect(service.resetPassword(token, NEW_PASSWORD)).rejects.toMatchObject({
				name: UnauthorizedError.CLASS_NAME
			});
			expect((await resetStorage.query()).entities).toHaveLength(0);
			expect((await userStorage.get("user-1"))?.passwordVersion).toBe(0);
		});

		test("keeps the token when the new password breaks the policy", async () => {
			await createUser("user@example.com", "user-1");
			const service = createService();
			const { token } = await PasswordResetHelper.create(resetStorage, "user-1", 30);

			await expect(service.resetPassword(token, "short")).rejects.toThrow();

			expect((await resetStorage.query()).entities).toHaveLength(1);
		});
	});

	describe("disabled accounts", () => {
		test("cannot sign in", async () => {
			const user = await createUser("user@example.com", "user-1");
			await userStorage.set({ ...user, dateDisabled: new Date().toISOString() });
			const service = createService();
			await ContextIdStore.run(NODE_CONTEXT, async () => service.start());

			await expect(service.login("user@example.com", PASSWORD)).rejects.toMatchObject({
				name: UnauthorizedError.CLASS_NAME,
				message: "entityStorageAuthenticationService.loginFailed"
			});
		});

		test("are disabled and enabled by an admin", async () => {
			await createUser("user@example.com", "user-1");
			const admin = new EntityStorageAuthenticationAdminService();

			await admin.disable("user@example.com");

			const disabled = await userStorage.get("user-1");
			expect(disabled?.dateDisabled).toEqual(expect.any(String));
			expect(disabled?.passwordVersion).toBe(1);
			expect((await admin.get("user-1")).dateDisabled).toBe(disabled?.dateDisabled);
			expect(audit.create).toHaveBeenCalledWith(
				expect.objectContaining({ event: "account-locked" })
			);

			await admin.enable("user-1");

			const enabled = await userStorage.get("user-1");
			expect(enabled?.dateDisabled).toBeUndefined();
			expect(enabled?.passwordVersion).toBe(1);
			expect(audit.create).toHaveBeenCalledWith(
				expect.objectContaining({ event: "account-unlocked" })
			);
		});

		test("cannot be the caller's own account", async () => {
			await createUser("admin@example.com", "admin-1");
			const admin = new EntityStorageAuthenticationAdminService();

			await expect(
				ContextIdStore.run({ [ContextIdKeys.Account]: "admin-1" }, async () =>
					admin.disable("admin-1")
				)
			).rejects.toMatchObject({
				name: ForbiddenError.CLASS_NAME,
				message: "entityStorageAuthenticationAdminService.disableSelfNotPermitted"
			});
		});

		test("cannot remove the caller's own account or set its password", async () => {
			const own = await createUser("admin@example.com", "admin-1");
			const admin = new EntityStorageAuthenticationAdminService();

			await ContextIdStore.run({ [ContextIdKeys.Account]: "admin-1" }, async () => {
				await expect(admin.remove("admin@example.com")).rejects.toMatchObject({
					name: ForbiddenError.CLASS_NAME,
					message: "entityStorageAuthenticationAdminService.removeSelfNotPermitted"
				});
				await expect(admin.updatePassword("admin-1", "Another@Pass12345!")).rejects.toMatchObject({
					name: ForbiddenError.CLASS_NAME,
					message: "entityStorageAuthenticationAdminService.resetSelfPasswordNotPermitted"
				});
			});
			expect((await userStorage.get("admin-1"))?.password).toBe(own.password);
		});
	});

	describe("query", () => {
		beforeEach(async () => {
			await createUser("alice@example.com", "user-1");
			await createUser("bob@example.com", "user-2");
			await userStorage.set({
				accountId: "user-3",
				email: "alice@other.com",
				authProviderId: "google",
				providerAccountId: "google-1",
				dateCreated: "2026-01-01T00:00:00.000Z",
				dateModified: "2026-01-01T00:00:00.000Z"
			});
		});

		test("filters by e-mail prefix, exact e-mail and provider without returning secrets", async () => {
			const admin = new EntityStorageAuthenticationAdminService();

			const byPrefix = await admin.query("alice@");
			expect(byPrefix.entities.map(u => u.accountId).sort()).toEqual(["user-1", "user-3"]);
			expect(byPrefix.entities[0]).not.toHaveProperty("password");
			expect(byPrefix.entities[0]).not.toHaveProperty("salt");

			const exact = await admin.query("alice@", true);
			expect(exact.entities).toHaveLength(0);

			const byProvider = await admin.query("alice@", false, "google");
			expect(byProvider.entities.map(u => u.accountId)).toEqual(["user-3"]);

			const all = await admin.query();
			expect(all.entities).toHaveLength(3);
		});

		test("lets a caller without escalated privilege query every account of the tenant", async () => {
			const authorization = {
				className: () => "authorization",
				hasRoleForSubject: vi.fn().mockResolvedValue(false)
			};
			ComponentFactory.register("authorization", () => authorization as never);
			components.authorization = authorization;
			const admin = new EntityStorageAuthenticationAdminService();

			for (const organization of ["did:example:org", undefined]) {
				const result = await ContextIdStore.run(
					{ [ContextIdKeys.Account]: "admin-1", [ContextIdKeys.UserOrganization]: organization },
					async () => admin.query()
				);
				expect(result.entities).toHaveLength(3);
			}
		});

		test("matches the e-mail address in lower case and returns the status of each account", async () => {
			const admin = new EntityStorageAuthenticationAdminService();
			await admin.disable("bob@example.com");

			const result = await admin.query("BOB@Example.com", true);

			expect(result.entities).toEqual([
				expect.objectContaining({ accountId: "user-2", disabled: true, verified: true })
			]);
		});
	});

	describe("removeAccount", () => {
		test("removes the signed in account, its data, requests and reset tokens", async () => {
			await createUser("user@example.com", "user-1");
			await PasswordResetHelper.create(resetStorage, "user-1", 30);
			let items = [{ id: "item-1" }];
			const accountAdmin = {
				className: () => "account-admin",
				query: vi.fn(async () => ({ entities: items })),
				remove: vi.fn(async () => {
					items = [];
				})
			} as unknown as IAuthenticationAccountAdminComponent;
			const organizationRequestAdmin = {
				className: () => "organization-request-admin",
				removeForAccount: vi.fn()
			} as unknown as IOrganizationRequestAdminComponent;
			ComponentFactory.register("authentication-account-admin", () => accountAdmin);
			ComponentFactory.register("organization-request-admin", () => organizationRequestAdmin);
			components["authentication-account-admin"] = accountAdmin;
			components["organization-request-admin"] = organizationRequestAdmin;
			const service = createService();

			await ContextIdStore.run(
				{
					[ContextIdKeys.Account]: "user-1",
					[ContextIdKeys.UserOrganization]: "did:example:org"
				},
				async () => service.removeAccount(Math.floor(Date.now() / DurationConstants.MsPerSecond))
			);

			expect(await userStorage.get("user-1")).toBeUndefined();
			expect((await resetStorage.query()).entities).toHaveLength(0);
			expect(accountAdmin.remove).toHaveBeenCalledWith("item-1");
			expect(organizationRequestAdmin.removeForAccount).toHaveBeenCalledWith("user-1");
			expect(audit.create).toHaveBeenCalledWith(
				expect.objectContaining({
					actorId: "user@example.com",
					event: "account-deleted"
				})
			);
		});

		test("requires a signed in account", async () => {
			const service = createService();

			await expect(service.removeAccount()).rejects.toThrow();
		});

		test("reports a missing account", async () => {
			const service = createService();

			await expect(
				ContextIdStore.run({ [ContextIdKeys.Account]: "missing" }, async () =>
					service.removeAccount(Math.floor(Date.now() / DurationConstants.MsPerSecond))
				)
			).rejects.toMatchObject({ name: "NotFoundError" });
		});

		test("requires a recent sign in", async () => {
			await createUser("user@example.com", "user-1");
			const service = createService();

			for (const sessionStart of [
				undefined,
				Math.floor(Date.now() / DurationConstants.MsPerSecond) - 301
			]) {
				await expect(
					ContextIdStore.run({ [ContextIdKeys.Account]: "user-1" }, async () =>
						service.removeAccount(sessionStart)
					)
				).rejects.toMatchObject({
					name: "UnauthorizedError",
					message: "recentSignInHelper.recentSignInRequired"
				});
			}
			expect(await userStorage.get("user-1")).toBeDefined();
		});

		test("removes the identity through the account component as the signed in account", async () => {
			await createUser("user@example.com", "user-1");
			const sessionStart = Math.floor(Date.now() / DurationConstants.MsPerSecond);
			const calls: string[] = [];
			const disabledWhenRemoved: boolean[] = [];
			const accountComponent = {
				className: () => "account",
				query: vi.fn(),
				removeIdentity: vi.fn(async () => {
					const contextIds = await ContextIdStore.getContextIds();
					calls.push(contextIds?.[ContextIdKeys.Account] ?? "");
					disabledWhenRemoved.push(
						AccountHelper.isDisabled((await userStorage.get("user-1")) as AuthenticationUser)
					);
				})
			} as unknown as IAuthenticationAccountComponent;
			ComponentFactory.register("authentication-account", () => accountComponent);
			components["authentication-account"] = accountComponent;
			const service = createService();

			await ContextIdStore.run({ [ContextIdKeys.Account]: "user-1" }, async () =>
				service.removeAccount(sessionStart)
			);

			expect(accountComponent.query).not.toHaveBeenCalled();
			expect(accountComponent.removeIdentity).toHaveBeenCalledWith(sessionStart);
			expect(calls).toEqual(["user-1"]);
			// The account is disabled before its identity is removed, so nothing signs in meanwhile.
			expect(disabledWhenRemoved).toEqual([true]);
			expect(await userStorage.get("user-1")).toBeUndefined();
		});

		test("removes an account without an identity", async () => {
			await createUser("user@example.com", "user-1");
			const accountComponent = {
				className: () => "account",
				removeIdentity: vi
					.fn()
					.mockRejectedValue(new NotFoundError("account", "identityNotFound", "user-1"))
			} as unknown as IAuthenticationAccountComponent;
			ComponentFactory.register("authentication-account", () => accountComponent);
			components["authentication-account"] = accountComponent;
			const service = createService();

			await ContextIdStore.run({ [ContextIdKeys.Account]: "user-1" }, async () =>
				service.removeAccount(Math.floor(Date.now() / DurationConstants.MsPerSecond))
			);

			expect(await userStorage.get("user-1")).toBeUndefined();
		});

		test("removes the roles of the account", async () => {
			await createUser("user@example.com", "user-1");
			const authorization = {
				className: () => "authorization",
				removeAllRolesForSubject: vi.fn()
			} as unknown as IAuthorizationComponent;
			ComponentFactory.register("authorization", () => authorization);
			components.authorization = authorization;
			const service = createService({ config: { authorizationModelId: "trade" } });

			await ContextIdStore.run({ [ContextIdKeys.Account]: "user-1" }, async () =>
				service.removeAccount(Math.floor(Date.now() / DurationConstants.MsPerSecond))
			);

			expect(authorization.removeAllRolesForSubject).toHaveBeenCalledWith("trade", "user-1");
			expect(await userStorage.get("user-1")).toBeUndefined();
		});

		test("keeps the account enabled when removing its identity fails", async () => {
			await createUser("user@example.com", "user-1");
			const accountComponent = {
				className: () => "account",
				removeIdentity: vi.fn().mockRejectedValue(new Error("vault down"))
			} as unknown as IAuthenticationAccountComponent;
			ComponentFactory.register("authentication-account", () => accountComponent);
			components["authentication-account"] = accountComponent;
			const service = createService();

			await expect(
				ContextIdStore.run({ [ContextIdKeys.Account]: "user-1" }, async () =>
					service.removeAccount(Math.floor(Date.now() / DurationConstants.MsPerSecond))
				)
			).rejects.toThrow("vault down");
			const user = await userStorage.get("user-1");
			expect(user).toBeDefined();
			// Enabled again so the owner can sign in and try again, the sessions stay ended.
			expect(AccountHelper.isDisabled(user as AuthenticationUser)).toBe(false);
			expect(user?.passwordVersion).toBe(1);
		});
	});

	test("fails to construct without the password reset storage", async () => {
		EntityStorageConnectorFactory.unregister("authentication-password-reset");
		try {
			expect(() => createService()).toThrow(GeneralError);
		} finally {
			EntityStorageConnectorFactory.register("authentication-password-reset", () => resetStorage);
		}
	});

	test("fails to construct without a component registered before it", async () => {
		for (const name of [
			"authentication-account",
			"authentication-account-admin",
			"organization-request-admin",
			"authorization",
			"task-scheduler",
			"platform"
		]) {
			ComponentFactory.unregister(name);
			try {
				expect(() => createService()).toThrow(GeneralError);
			} finally {
				ComponentFactory.register(name, () => components[name] as never);
			}
		}
	});

	test("lets an escalated caller query every account", async () => {
		const authorization = {
			className: () => "authorization",
			hasRoleForSubject: vi.fn().mockResolvedValue(true)
		} as unknown as IAuthorizationComponent;
		ComponentFactory.register("authorization", () => authorization);
		components.authorization = authorization;
		await createUser("user@example.com", "user-1");
		const admin = new EntityStorageAuthenticationAdminService();

		const result = await ContextIdStore.run({ [ContextIdKeys.Account]: "admin-1" }, async () =>
			admin.query()
		);

		expect(result.entities).toHaveLength(1);
	});

	describe("e-mail addresses", () => {
		test("are stored in lower case and matched whatever the case", async () => {
			await createUser(" User@Example.COM ", "user-1");
			const service = createService();
			await ContextIdStore.run(NODE_CONTEXT, async () => service.start());

			expect((await userStorage.get("user-1"))?.email).toBe("user@example.com");
			await expect(service.login("USER@example.com", PASSWORD)).resolves.toMatchObject({
				accountId: "user-1"
			});
			await service.forgotPassword("User@Example.com");
			await runDeliveries();
			expect(messaging.sendCustomEmail).toHaveBeenCalledTimes(1);
		});

		test("still find an account stored before addresses were normalised", async () => {
			const user = await createUser("legacy@example.com", "user-1");
			await userStorage.set({ ...user, email: "Legacy@Example.com" });
			const service = createService();
			await ContextIdStore.run(NODE_CONTEXT, async () => service.start());

			await expect(service.login("Legacy@Example.com", PASSWORD)).resolves.toMatchObject({
				accountId: "user-1"
			});
		});
	});

	describe("passwords", () => {
		test("are hashed with Argon2id and checked", async () => {
			const user = await createUser("user@example.com", "user-1");

			expect(user.passwordAlgorithm).toBe("argon2id");
			expect(user.passwordHashParameters).toBe("t=2,m=19456,p=1");
			await expect(PasswordHelper.verifyPassword(user, PASSWORD)).resolves.toBe(true);
			await expect(PasswordHelper.verifyPassword(user, NEW_PASSWORD)).resolves.toBe(false);
			expect(PasswordHelper.needsRehash(user)).toBe(false);
			expect(PasswordHelper.needsRehash(user, { iterations: 3 })).toBe(true);
		});

		test("stored with the legacy hash are still checked and marked for a new hash", async () => {
			const salt = new Uint8Array(16).fill(7);
			const legacy: AuthenticationUser = {
				accountId: "user-1",
				email: "user@example.com",
				authProviderId: "3sixty",
				providerAccountId: "user@example.com",
				salt: Converter.bytesToBase64(salt),
				password: await PasswordGenerator.hashPassword(Converter.utf8ToBytes(PASSWORD), salt),
				dateCreated: "2026-01-01T00:00:00.000Z",
				dateModified: "2026-01-01T00:00:00.000Z"
			};

			await expect(PasswordHelper.verifyPassword(legacy, PASSWORD)).resolves.toBe(true);
			await expect(PasswordHelper.verifyPassword(legacy, NEW_PASSWORD)).resolves.toBe(false);
			expect(PasswordHelper.needsRehash(legacy)).toBe(true);
			await expect(
				PasswordHelper.verifyPassword({ ...legacy, passwordAlgorithm: "unknown" }, PASSWORD)
			).resolves.toBe(false);
		});

		test("need the current password to change your own", async () => {
			await createUser("user@example.com", "user-1");
			await PasswordResetHelper.create(resetStorage, "user-1", 30);
			const service = createService();
			await ContextIdStore.run(NODE_CONTEXT, async () => service.start());
			const asUser = async <T>(method: () => Promise<T>): Promise<T> =>
				ContextIdStore.run({ ...NODE_CONTEXT, [ContextIdKeys.Account]: "user-1" }, method);

			await expect(
				asUser(async () => service.updatePassword("", NEW_PASSWORD))
			).rejects.toMatchObject({ name: "GuardError" });
			const mismatch = await asUser(async () =>
				service.updatePassword(NEW_PASSWORD, NEW_PASSWORD)
			).catch(err => err);
			expect(mismatch).toMatchObject({
				name: ForbiddenError.CLASS_NAME,
				message: "passwordHelper.currentPasswordMismatch"
			});
			expect(HttpErrorHelper.processError(mismatch).httpStatusCode).toBe(HttpStatusCode.forbidden);
			expect((await userStorage.get("user-1"))?.passwordVersion).toBe(0);

			const result = await asUser(async () => service.updatePassword(PASSWORD, NEW_PASSWORD));

			expect(result).toEqual({ token: "jwt", expiry: 1 });
			expect((await userStorage.get("user-1"))?.passwordVersion).toBe(1);
			expect(vi.mocked(TokenHelper.createToken).mock.calls[0][6]).toBe(1);
			expect((await resetStorage.query()).entities).toHaveLength(0);
		});

		test("refuse an admin create for an e-mail address in use as a conflict", async () => {
			await createUser("user@example.com", "user-1");
			const admin = new EntityStorageAuthenticationAdminService();

			const error = await admin
				.create({ email: "User@Example.com", password: NEW_PASSWORD })
				.catch(err => err);

			expect(error).toMatchObject({
				name: "ConflictError",
				message: "entityStorageAuthenticationAdminService.userExists"
			});
			expect(HttpErrorHelper.processError(error).httpStatusCode).toBe(HttpStatusCode.conflict);
		});

		test("are set by an admin without the current password, removing the reset links", async () => {
			await createUser("user@example.com", "user-1");
			await PasswordResetHelper.create(resetStorage, "user-1", 30);
			const admin = new EntityStorageAuthenticationAdminService();

			await ContextIdStore.run({ [ContextIdKeys.Account]: "admin-1" }, async () =>
				admin.updatePassword("User@Example.com", NEW_PASSWORD)
			);

			const user = await userStorage.get("user-1");
			expect(user?.passwordVersion).toBe(1);
			await expect(
				PasswordHelper.verifyPassword(user as AuthenticationUser, NEW_PASSWORD)
			).resolves.toBe(true);
			expect((await resetStorage.query()).entities).toHaveLength(0);
			expect(audit.create).toHaveBeenCalledWith({
				actorId: "admin-1",
				event: "password-changed",
				data: { accountId: "user-1", email: "user@example.com", actorAccountId: "admin-1" }
			});
		});
	});

	describe("token caches", () => {
		test("are cleared of the tokens of an account whenever its sessions end", async () => {
			const invalidate = vi.spyOn(AuthTokenCache, "invalidate");
			await createUser("user@example.com", "user-1");
			const admin = new EntityStorageAuthenticationAdminService();
			const service = createService();
			await ContextIdStore.run(NODE_CONTEXT, async () => service.start());
			const asUser = async <T>(method: () => Promise<T>): Promise<T> =>
				ContextIdStore.run({ ...NODE_CONTEXT, [ContextIdKeys.Account]: "user-1" }, method);

			await asUser(async () => service.updatePassword(PASSWORD, NEW_PASSWORD));
			expect(invalidate).toHaveBeenCalledTimes(1);

			await admin.updatePassword("user-1", PASSWORD);
			expect(invalidate).toHaveBeenCalledTimes(2);

			const { token } = await PasswordResetHelper.create(resetStorage, "user-1", 30);
			await ContextIdStore.run(NODE_CONTEXT, async () =>
				service.resetPassword(token, NEW_PASSWORD)
			);
			expect(invalidate).toHaveBeenCalledTimes(3);

			await admin.disable("user-1");
			expect(invalidate).toHaveBeenCalledTimes(4);

			await admin.remove("user-1");
			expect(invalidate).toHaveBeenCalledTimes(5);

			await createUser("other@example.com", "user-2");
			await ContextIdStore.run({ ...NODE_CONTEXT, [ContextIdKeys.Account]: "user-2" }, async () =>
				service.removeAccount(Math.floor(Date.now() / DurationConstants.MsPerSecond))
			);
			// Disabled before its identity is removed, and checked again when the account is removed.
			expect(invalidate).toHaveBeenCalledTimes(7);

			expect(invalidate.mock.calls.map(([accountId]) => accountId)).toEqual([
				"user-1",
				"user-1",
				"user-1",
				"user-1",
				"user-1",
				"user-2",
				"user-2"
			]);
		});
	});

	describe("disabled and unverified accounts", () => {
		test("are disabled with the date, ending sessions and removing the reset links", async () => {
			await createUser("user@example.com", "user-1");
			await PasswordResetHelper.create(resetStorage, "user-1", 30);
			const admin = new EntityStorageAuthenticationAdminService();

			await admin.disable("user@example.com");

			expect(await userStorage.get("user-1")).toMatchObject({
				dateDisabled: expect.any(String),
				passwordVersion: 1
			});
			expect((await resetStorage.query()).entities).toHaveLength(0);
			expect(await admin.get("user-1")).toMatchObject({ disabled: true });

			await admin.enable("user-1");
			expect(await admin.get("user-1")).toMatchObject({ disabled: false });
		});

		test("can be created disabled by an admin", async () => {
			const admin = new EntityStorageAuthenticationAdminService();

			await admin.create({ email: "new@example.com", password: PASSWORD, disabled: true });

			const created = await admin.get("new@example.com");
			expect(created).toMatchObject({ disabled: true, verified: true });
			expect(created.dateDisabled).toEqual(expect.any(String));
		});

		test("look the same as a wrong password when signing in", async () => {
			const disabled = await createUser("disabled@example.com", "user-1");
			await userStorage.set({ ...disabled, dateDisabled: new Date().toISOString() });
			const unverified = await createUser("unverified@example.com", "user-2");
			await userStorage.set({ ...unverified, verified: false });
			const disabledUnverified = await createUser("disabled-unverified@example.com", "user-4");
			await userStorage.set({
				...disabledUnverified,
				verified: false,
				dateDisabled: new Date().toISOString()
			});
			await createUser("user@example.com", "user-3");
			const service = createService();
			await ContextIdStore.run(NODE_CONTEXT, async () => service.start());

			const errors = await Promise.all([
				service.login("disabled@example.com", PASSWORD).catch(e => e),
				// A wrong password reveals nothing about an unverified account.
				service.login("unverified@example.com", NEW_PASSWORD).catch(e => e),
				service.login("disabled-unverified@example.com", PASSWORD).catch(e => e),
				service.login("user@example.com", NEW_PASSWORD).catch(e => e),
				service.login("missing@example.com", PASSWORD).catch(e => e)
			]);

			for (const error of errors) {
				expect(error).toBeInstanceOf(UnauthorizedError);
				expect(error.message).toBe("entityStorageAuthenticationService.loginFailed");
				expect(error.cause).toBeUndefined();
			}
		});

		test("tell the owner of an unverified account who signs in with its password to verify it", async () => {
			const unverified = await createUser("unverified@example.com", "user-2");
			await userStorage.set({ ...unverified, verified: false });
			const service = createService();
			await ContextIdStore.run(NODE_CONTEXT, async () => service.start());

			const error = await service.login("Unverified@Example.com", PASSWORD).catch(e => e);

			expect(error).toBeInstanceOf(UnauthorizedError);
			expect(error.message).toBe("entityStorageAuthenticationService.accountNotVerified");
			expect(error.cause).toBeUndefined();
			expect((await userStorage.get("user-2"))?.dateLastLogin).toBeUndefined();
		});

		test("receive no reset link and cannot complete a reset when disabled", async () => {
			const disabled = await createUser("disabled@example.com", "user-1");
			await userStorage.set({ ...disabled, dateDisabled: new Date().toISOString() });
			const disabledUnverified = await createUser("disabled-unverified@example.com", "user-2");
			await userStorage.set({
				...disabledUnverified,
				verified: false,
				dateDisabled: new Date().toISOString()
			});
			const service = createService();

			await service.forgotPassword("disabled@example.com");
			await service.forgotPassword("disabled-unverified@example.com");
			expect(messaging.sendCustomEmail).not.toHaveBeenCalled();

			for (const accountId of ["user-1", "user-2"]) {
				const { token } = await PasswordResetHelper.create(resetStorage, accountId, 30);
				await expect(service.resetPassword(token, NEW_PASSWORD)).rejects.toMatchObject({
					message: "entityStorageAuthenticationService.passwordResetInvalid"
				});
			}
		});

		test("are verified by resetting the password with a link sent to the address", async () => {
			const authorization = {
				className: () => "authorization",
				addRoleForSubject: vi.fn(),
				getRolesForSubject: vi.fn().mockResolvedValue(["user"])
			} as unknown as IAuthorizationComponent;
			ComponentFactory.register("authorization", () => authorization);
			components.authorization = authorization;
			const unverified = await createUser("unverified@example.com", "user-2");
			await userStorage.set({ ...unverified, verified: false });
			const service = createService();
			await ContextIdStore.run(NODE_CONTEXT, async () => service.start());

			await service.forgotPassword("unverified@example.com");
			await runDeliveries();
			const [, recipients, templateId, data] = vi.mocked(messaging.sendCustomEmail).mock.calls[0];
			expect(recipients).toEqual(["unverified@example.com"]);
			expect(templateId).toBe("password-reset");
			const token = new URL(data.resetUrl).searchParams.get("token") ?? "";

			await service.resetPassword(token, NEW_PASSWORD);

			expect(await userStorage.get("user-2")).toMatchObject({ verified: true, passwordVersion: 1 });
			expect(authorization.addRoleForSubject).toHaveBeenCalledWith("system", "user-2", "user");
			await expect(service.login("unverified@example.com", PASSWORD)).rejects.toMatchObject({
				message: "entityStorageAuthenticationService.loginFailed"
			});
			await expect(service.login("unverified@example.com", NEW_PASSWORD)).resolves.toMatchObject({
				accountId: "user-2",
				roles: ["user"]
			});
		});

		test("cannot refresh a token", async () => {
			const user = await createUser("user@example.com", "user-1");
			await userStorage.set({ ...user, dateDisabled: new Date().toISOString() });
			const service = createService();
			await ContextIdStore.run(NODE_CONTEXT, async () => service.start());
			vi.spyOn(TokenHelper, "verify").mockImplementation(
				async (vault, nodeId, keyName, token, verifyUser) => {
					const parts = await verifyUser?.("user-1", undefined, 0);
					if (!parts?.includes("user")) {
						throw new UnauthorizedError(TokenHelper.CLASS_NAME, "userNotVerified");
					}
					return { header: { alg: "EdDSA" }, payload: { sub: "user-1" } };
				}
			);

			const error = await service.refresh("token").catch(e => e);

			expect(error).toMatchObject({
				message: "entityStorageAuthenticationService.refreshFailed"
			});
			expect(error.cause).toBeUndefined();
		});
	});

	describe("sessions", () => {
		test("keep their start across a refresh and end at the maximum length", async () => {
			await createUser("user@example.com", "user-1");
			const service = createService({ config: { maxSessionMinutes: 60 } });
			await ContextIdStore.run(NODE_CONTEXT, async () => service.start());
			const nowSeconds = Math.trunc(Date.now() / DurationConstants.MsPerSecond);
			let sessionStart = nowSeconds - 1800;
			vi.spyOn(TokenHelper, "verify").mockImplementation(async () => ({
				header: { alg: "EdDSA" },
				payload: { sub: "user-1", sst: sessionStart, pver: 0 }
			}));

			await service.refresh("token");
			expect(TokenHelper.createToken).toHaveBeenLastCalledWith(
				expect.anything(),
				"node-1",
				"auth-signing",
				"user-1",
				undefined,
				60,
				0,
				sessionStart,
				60
			);

			// Past the maximum of 60 minutes.
			sessionStart = nowSeconds - 3660;
			await expect(service.refresh("token")).rejects.toMatchObject({
				message: "entityStorageAuthenticationService.refreshFailed"
			});
		});

		test("are rate limited on their own when refreshed", async () => {
			await createUser("user@example.com", "user-1");
			const service = createService();
			await ContextIdStore.run(NODE_CONTEXT, async () => service.start());
			const sessionStart = Math.trunc(Date.now() / DurationConstants.MsPerSecond) - 60;
			vi.spyOn(TokenHelper, "verify").mockImplementation(async () => ({
				header: { alg: "EdDSA" },
				payload: { sub: "user-1", sst: sessionStart, pver: 0 }
			}));

			await service.refresh("token");

			expect(rate.check).toHaveBeenCalledWith("token-refresh", `user-1|${sessionStart}`);
		});

		test("without a start, from an earlier version, never become a recent sign in", async () => {
			await createUser("user@example.com", "user-1");
			const service = createService();
			await ContextIdStore.run(NODE_CONTEXT, async () => service.start());
			vi.spyOn(TokenHelper, "verify").mockImplementation(async () => ({
				header: { alg: "EdDSA" },
				payload: { sub: "user-1", pver: 0 }
			}));

			await service.refresh("token");

			expect(vi.mocked(TokenHelper.createToken).mock.lastCall?.[7]).toBeNull();
			expect(rate.check).toHaveBeenCalledWith("token-refresh", "user-1");
		});

		test("without a start cannot be refreshed when their length is limited", async () => {
			await createUser("user@example.com", "user-1");
			const service = createService({ config: { maxSessionMinutes: 60 } });
			await ContextIdStore.run(NODE_CONTEXT, async () => service.start());
			vi.spyOn(TokenHelper, "verify").mockImplementation(async () => ({
				header: { alg: "EdDSA" },
				payload: { sub: "user-1", pver: 0 }
			}));

			await expect(service.refresh("token")).rejects.toMatchObject({
				message: "entityStorageAuthenticationService.refreshFailed"
			});
			expect(TokenHelper.createToken).not.toHaveBeenCalled();
		});
	});

	describe("cleanup", () => {
		function scheduler(): {
			scheduler: unknown;
			run: (prefix: string) => Promise<void>;
		} {
			const callbacks: { [id: string]: () => Promise<void> } = {};
			return {
				scheduler: {
					className: () => "scheduler",
					addTask: vi.fn(async (id: string, times: unknown, callback: () => Promise<void>) => {
						callbacks[id] = callback;
					}),
					removeTask: vi.fn(),
					tasksInfo: vi.fn()
				},
				run: async (prefix: string) => {
					for (const [id, callback] of Object.entries(callbacks)) {
						if (id.startsWith(prefix)) {
							await callback();
						}
					}
				}
			};
		}

		test("removes expired tokens and unverified sign ups whose links have all expired", async () => {
			const tasks = scheduler();
			ComponentFactory.register("task-scheduler", () => tasks.scheduler as never);
			components["task-scheduler"] = tasks.scheduler;
			const expired = await createUser("expired@example.com", "user-1");
			await userStorage.set({
				...expired,
				verified: false,
				dateCreated: "2020-01-01T00:00:00.000Z"
			});
			const linked = await createUser("linked@example.com", "user-2");
			await userStorage.set({
				...linked,
				verified: false,
				dateCreated: "2020-01-01T00:00:00.000Z"
			});
			await PasswordResetHelper.create(resetStorage, "user-2", 30, "registration");
			const recent = await createUser("recent@example.com", "user-3");
			await userStorage.set({ ...recent, verified: false });
			await createUser("verified@example.com", "user-4");
			await resetStorage.set({
				id: "expired-token",
				accountId: "user-4",
				expires: "2020-01-01T00:00:00.000Z",
				dateCreated: "2020-01-01T00:00:00.000Z"
			});
			const service = createService({ config: { cleanupIntervalMinutes: 5 } });
			await ContextIdStore.run(NODE_CONTEXT, async () => service.start());

			expect(
				vi
					.mocked((tasks.scheduler as { addTask: ReturnType<typeof vi.fn> }).addTask)
					.mock.calls.find(([id]) => String(id).startsWith("authentication-cleanup-"))?.[1]
			).toEqual([{ intervalMinutes: 5 }]);

			await tasks.run("authentication-cleanup-");

			expect(await userStorage.get("user-1")).toBeUndefined();
			expect(await userStorage.get("user-2")).toBeDefined();
			expect(await userStorage.get("user-3")).toBeDefined();
			expect(await userStorage.get("user-4")).toBeDefined();
			expect((await resetStorage.query()).entities.map(reset => reset.accountId)).toEqual([
				"user-2"
			]);

			await service.stop();
			expect(
				(tasks.scheduler as { removeTask: ReturnType<typeof vi.fn> }).removeTask
			).toHaveBeenCalledTimes(2);
		});

		test("delivers the queued e-mails every minute, or at the configured delivery interval", async () => {
			for (const [config, intervalSeconds] of [
				[{}, 60],
				[{ deliveryIntervalSeconds: 1 }, 1]
			] as const) {
				const tasks = scheduler();
				ComponentFactory.register("task-scheduler", () => tasks.scheduler as never);
				components["task-scheduler"] = tasks.scheduler;
				const service = createService({ config });
				await ContextIdStore.run(NODE_CONTEXT, async () => service.start());

				expect(
					vi
						.mocked((tasks.scheduler as { addTask: ReturnType<typeof vi.fn> }).addTask)
						.mock.calls.find(([id]) => String(id).startsWith("authentication-delivery-"))?.[1]
				).toEqual([{ intervalSeconds }]);

				await service.stop();
			}
		});
	});

	describe("sign up", () => {
		let authorization: IAuthorizationComponent;

		beforeEach(() => {
			authorization = {
				className: () => "authorization",
				addRoleForSubject: vi.fn(),
				getRolesForSubject: vi.fn().mockResolvedValue(["user"]),
				removeAllRolesForSubject: vi.fn()
			} as unknown as IAuthorizationComponent;
			ComponentFactory.register("authorization", () => authorization);
			components.authorization = authorization;
		});

		test("creates an unverified account without roles and e-mails a verification link", async () => {
			const service = createService();
			await ContextIdStore.run(NODE_CONTEXT, async () => service.start());

			await expect(
				service.register({ email: "New@Example.com", password: PASSWORD })
			).resolves.toBeUndefined();
			await runDeliveries();

			const created = await AccountHelper.findByEmail(userStorage, "3sixty", "new@example.com");
			expect(created).toMatchObject({ email: "new@example.com", verified: false });
			expect(authorization.addRoleForSubject).not.toHaveBeenCalled();
			const [sender, recipients, templateId, data] = vi.mocked(messaging.sendCustomEmail).mock
				.calls[0];
			expect(sender).toBe("no-reply@example.com");
			expect(recipients).toEqual(["new@example.com"]);
			expect(templateId).toBe("registration-verify");
			const token = new URL(data.verifyUrl).searchParams.get("token") ?? "";

			await expect(service.login("new@example.com", PASSWORD)).rejects.toMatchObject({
				message: "entityStorageAuthenticationService.accountNotVerified"
			});
			await expect(service.login("new@example.com", NEW_PASSWORD)).rejects.toMatchObject({
				message: "entityStorageAuthenticationService.loginFailed"
			});
			// A verification token cannot reset a password.
			await expect(service.resetPassword(token, NEW_PASSWORD)).rejects.toMatchObject({
				message: "entityStorageAuthenticationService.passwordResetInvalid"
			});
			const again = await service.register({ email: "new@example.com", password: PASSWORD });
			await runDeliveries();
			expect(again).toBeUndefined();
			const resent = vi.mocked(messaging.sendCustomEmail).mock.calls[1];
			const newToken = new URL(resent[3].verifyUrl).searchParams.get("token") ?? "";

			await service.verifyRegistration(newToken);

			expect((await userStorage.get(created?.accountId ?? ""))?.verified).toBe(true);
			expect(authorization.addRoleForSubject).toHaveBeenCalledWith(
				"system",
				created?.accountId,
				"user"
			);
			await expect(service.login("new@example.com", PASSWORD)).resolves.toMatchObject({
				accountId: created?.accountId
			});
			await expect(service.verifyRegistration(newToken)).rejects.toMatchObject({
				name: UnauthorizedError.CLASS_NAME,
				message: "entityStorageAuthenticationService.registrationVerificationInvalid"
			});
		});

		test("gives the account the password of the sign up whose link is verified", async () => {
			const ATTACKER_PASSWORD = "Attacker-Horse-Battery-Staple-3";
			const service = createService();
			await ContextIdStore.run(NODE_CONTEXT, async () => service.start());
			const linkOf = (call: number): string =>
				new URL(
					vi.mocked(messaging.sendCustomEmail).mock.calls[call][3].verifyUrl
				).searchParams.get("token") ?? "";

			// The attacker signs up first with the victim's address, then the victim signs up.
			await service.register({ email: "victim@example.com", password: ATTACKER_PASSWORD });
			await runDeliveries();
			const attackerToken = linkOf(0);
			await service.register({ email: "victim@example.com", password: PASSWORD });
			await runDeliveries();
			const victimToken = linkOf(1);

			// Only the latest link is kept, and the hash is stored with it but never sent.
			const stored = (await resetStorage.query()).entities;
			expect(stored).toHaveLength(1);
			expect(stored[0].id).toBe(PasswordResetHelper.hashToken(victimToken));
			expect(stored[0].password).toEqual(expect.any(String));
			for (const call of vi.mocked(messaging.sendCustomEmail).mock.calls) {
				expect(JSON.stringify(call)).not.toContain(stored[0].password);
			}

			await expect(service.verifyRegistration(attackerToken)).rejects.toMatchObject({
				message: "entityStorageAuthenticationService.registrationVerificationInvalid"
			});
			await service.verifyRegistration(victimToken);

			await expect(service.login("victim@example.com", PASSWORD)).resolves.toMatchObject({
				token: "jwt"
			});
			await expect(service.login("victim@example.com", ATTACKER_PASSWORD)).rejects.toMatchObject({
				message: "entityStorageAuthenticationService.loginFailed"
			});
			expect((await resetStorage.query()).entities).toHaveLength(0);
		});

		test("tells the owner of an address that has an account and creates nothing", async () => {
			await createUser("user@example.com", "user-1");
			const service = createService();
			await ContextIdStore.run(NODE_CONTEXT, async () => service.start());

			await expect(
				service.register({ email: "user@example.com", password: NEW_PASSWORD })
			).resolves.toBeUndefined();
			await runDeliveries();

			expect((await userStorage.query()).entities).toHaveLength(1);
			expect(vi.mocked(messaging.sendCustomEmail).mock.calls[0][2]).toBe("registration-exists");
			await expect(
				PasswordHelper.verifyPassword(
					(await userStorage.get("user-1")) as AuthenticationUser,
					PASSWORD
				)
			).resolves.toBe(true);
		});

		test("replaces an unverified sign up once its link has expired", async () => {
			const stale = await createUser("user@example.com", "user-1");
			await userStorage.set({ ...stale, verified: false, dateCreated: "2020-01-01T00:00:00.000Z" });
			const service = createService();
			await ContextIdStore.run(NODE_CONTEXT, async () => service.start());

			await service.register({ email: "user@example.com", password: NEW_PASSWORD });
			await runDeliveries();

			expect(await userStorage.get("user-1")).toBeUndefined();
			const replaced = await AccountHelper.findByEmail(userStorage, "3sixty", "user@example.com");
			expect(replaced?.verified).toBe(false);
			expect(vi.mocked(messaging.sendCustomEmail).mock.calls[0][2]).toBe("registration-verify");
		});

		test("refuses verification when the password provider is not registered", async () => {
			const service = createService();
			AuthenticationProviderFactory.unregister(
				EntityStorageAuthenticationAdminService.AUTH_PROVIDER_ID
			);
			try {
				await expect(service.verifyRegistration("token")).rejects.toMatchObject({
					name: ForbiddenError.CLASS_NAME,
					message: "entityStorageAuthenticationService.selfRegistrationDisabled"
				});
			} finally {
				registerTestPasswordProvider();
			}
		});

		test("works after the response", async () => {
			let runDelivery: (() => Promise<void>) | undefined;
			const scheduler = {
				className: () => "scheduler",
				addTask: vi.fn(async (id: string, times: unknown, callback: () => Promise<void>) => {
					if (id.startsWith("authentication-delivery-")) {
						runDelivery = callback;
					}
				}),
				removeTask: vi.fn(),
				tasksInfo: vi.fn()
			};
			ComponentFactory.register("task-scheduler", () => scheduler as never);
			components["task-scheduler"] = scheduler;
			await createUser("user@example.com", "user-1");
			const service = createService();
			await ContextIdStore.run(NODE_CONTEXT, async () => service.start());
			const hashPassword = vi.spyOn(PasswordHelper, "hashPassword");

			await service.register({ email: "new@example.com", password: PASSWORD });
			// The password is hashed before the work is queued, so the queue never holds it.
			expect(hashPassword).toHaveBeenCalledTimes(1);
			await service.forgotPassword("user@example.com");
			await service.forgotPassword("missing@example.com");

			expect(messaging.sendCustomEmail).not.toHaveBeenCalled();
			expect((await userStorage.query()).entities).toHaveLength(1);

			await runDelivery?.();

			expect(
				vi
					.mocked(messaging.sendCustomEmail)
					.mock.calls.map(call => call[2])
					.sort()
			).toEqual(["password-reset", "registration-verify"]);
			expect((await userStorage.query()).entities).toHaveLength(2);

			await service.stop();
			expect(scheduler.removeTask).toHaveBeenCalled();
		});
	});

	describe("rate limits", () => {
		test("limit logins per address only by default", async () => {
			await createUser("user@example.com", "user-1");
			const service = createService();
			await ContextIdStore.run(NODE_CONTEXT, async () => service.start());

			await ContextIdStore.run({ [HttpContextIdKeys.IpAddress]: "10.0.0.1" }, async () =>
				service.login("User@Example.com", PASSWORD)
			);

			expect(vi.mocked(rate.check).mock.calls).toEqual([["login", "user@example.com"]]);
		});

		test("limit logins per client and per address with the client when enabled", async () => {
			await createUser("user@example.com", "user-1");
			const service = createService({
				config: { loginRateLimitPerClient: true, clientAddressRateLimitEnabled: true }
			});
			await ContextIdStore.run(NODE_CONTEXT, async () => service.start());

			await ContextIdStore.run({ [HttpContextIdKeys.IpAddress]: "10.0.0.1" }, async () =>
				service.login("User@Example.com", PASSWORD)
			);

			const keys = vi.mocked(rate.check).mock.calls;
			expect(keys).toContainEqual(["login-account", "user@example.com"]);
			expect(keys).toContainEqual(["login-client", expect.stringMatching(/^ip-[\da-f]{64}$/)]);
			expect(keys).toContainEqual([
				"login",
				expect.stringMatching(/^user@example\.com\|ip-[\da-f]{64}$/)
			]);
		});

		test("do not use an untrusted client address", async () => {
			await createUser("user@example.com", "user-1");
			const service = createService({
				config: {
					loginRateLimitPerClient: true
				}
			});
			await ContextIdStore.run(NODE_CONTEXT, async () => service.start());

			await ContextIdStore.run(
				{ ...NODE_CONTEXT, [HttpContextIdKeys.IpAddress]: "10.0.0.1" },
				async () => {
					await service.login("user@example.com", PASSWORD);
					await service.register({ email: "new@example.com", password: PASSWORD });
					await service.verifyRegistration("unknown-token").catch(e => e);
					await service.resetPassword("unknown-token", NEW_PASSWORD).catch(e => e);
				}
			);

			const keys = vi.mocked(rate.check).mock.calls;
			expect(keys).toContainEqual(["login-account", "user@example.com"]);
			expect(keys).toContainEqual(["login", "user@example.com"]);
			expect(keys).toContainEqual(["register", "new@example.com"]);
			expect(keys).toContainEqual([
				"register-verify",
				`token-${PasswordResetHelper.hashToken("unknown-token")}`
			]);
			expect(keys).toContainEqual([
				"password-reset",
				PasswordResetHelper.hashToken("unknown-token")
			]);
			expect(keys.some(([action, key]) => action === "login-client" || key.includes("ip-"))).toBe(
				false
			);
		});
	});

	describe("authorize", () => {
		const PUBLIC_CONTEXT: IContextIds = {
			...NODE_CONTEXT,
			[HttpContextIdKeys.PublicOrigin]: "https://node.example.com/api"
		};
		const CALLBACK = "https://node.example.com/api/authentication/oauth/3sixty-oauth/callback";
		const AUTHORIZATION = {
			state: "state-1",
			nonce: "nonce-1",
			codeChallenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
			codeChallengeMethod: "S256",
			redirectUri: CALLBACK
		};

		test("issues a single use code bound to the request and sends it to the callback", async () => {
			await createUser("user@example.com", "user-1");
			const service = createService();
			await ContextIdStore.run(NODE_CONTEXT, async () => service.start());

			const location = await ContextIdStore.run(PUBLIC_CONTEXT, async () =>
				service.authorize("User@Example.com", PASSWORD, AUTHORIZATION)
			);

			const url = new URL(location);
			expect(`${url.origin}${url.pathname}`).toBe(CALLBACK);
			expect(url.searchParams.get("state")).toBe("state-1");
			const code = url.searchParams.get("code") ?? "";
			expect(code.length).toBeGreaterThan(20);

			// Only the hash of the code is stored, with what it was issued for.
			const stored = await codeStorage.get(PasswordResetHelper.hashToken(code));
			expect(stored).toMatchObject({
				accountId: "user-1",
				redirectUri: CALLBACK,
				codeChallenge: AUTHORIZATION.codeChallenge,
				nonce: "nonce-1"
			});
			expect(Date.parse(stored?.expires ?? "") - Date.now()).toBeLessThanOrEqual(60000);
			// No session is started until the code is redeemed.
			expect((await userStorage.get("user-1"))?.dateLastLogin).toBeUndefined();
		});

		test("refuses a wrong password, a disabled account and an unknown one like a login", async () => {
			const disabled = await createUser("disabled@example.com", "user-1");
			await userStorage.set({ ...disabled, dateDisabled: new Date().toISOString() });
			await createUser("user@example.com", "user-2");
			const service = createService();
			await ContextIdStore.run(NODE_CONTEXT, async () => service.start());

			const errors = await ContextIdStore.run(PUBLIC_CONTEXT, async () =>
				Promise.all([
					service.authorize("disabled@example.com", PASSWORD, AUTHORIZATION).catch(e => e),
					service.authorize("user@example.com", NEW_PASSWORD, AUTHORIZATION).catch(e => e),
					service.authorize("missing@example.com", PASSWORD, AUTHORIZATION).catch(e => e)
				])
			);

			for (const error of errors) {
				expect(error).toBeInstanceOf(UnauthorizedError);
				expect(error.message).toBe("entityStorageAuthenticationService.loginFailed");
			}
			expect((await codeStorage.query()).entities).toHaveLength(0);
		});

		test("tells the owner of an unverified account to verify it", async () => {
			const unverified = await createUser("unverified@example.com", "user-1");
			await userStorage.set({ ...unverified, verified: false });
			const service = createService();
			await ContextIdStore.run(NODE_CONTEXT, async () => service.start());

			await expect(
				ContextIdStore.run(PUBLIC_CONTEXT, async () =>
					service.authorize("unverified@example.com", PASSWORD, AUTHORIZATION)
				)
			).rejects.toMatchObject({ message: "entityStorageAuthenticationService.accountNotVerified" });
		});

		test.each([
			{
				reason: "another origin",
				redirectUri: "https://evil.example.com/api/authentication/oauth/3sixty-oauth/callback"
			},
			{ reason: "a path outside the node", redirectUri: "https://node.example.com/other/callback" },
			{
				reason: "a query",
				redirectUri: "https://node.example.com/api/callback?next=https://evil.example.com"
			},
			{ reason: "a fragment", redirectUri: "https://node.example.com/api/callback#code" },
			{ reason: "an invalid address", redirectUri: "not a url" }
		])(
			"refuses a redirect address with $reason before checking the password",
			async ({ redirectUri }) => {
				await createUser("user@example.com", "user-1");
				const service = createService();
				await ContextIdStore.run(NODE_CONTEXT, async () => service.start());

				await expect(
					ContextIdStore.run(PUBLIC_CONTEXT, async () =>
						service.authorize("user@example.com", PASSWORD, { ...AUTHORIZATION, redirectUri })
					)
				).rejects.toMatchObject({
					name: "UnprocessableError",
					message: "entityStorageAuthenticationService.authorizationRedirectInvalid"
				});
				expect(rate.check).not.toHaveBeenCalled();
			}
		);

		test("refuses a code challenge method other than S256", async () => {
			const service = createService();
			await ContextIdStore.run(NODE_CONTEXT, async () => service.start());

			await expect(
				ContextIdStore.run(PUBLIC_CONTEXT, async () =>
					service.authorize("user@example.com", PASSWORD, {
						...AUTHORIZATION,
						codeChallengeMethod: "plain"
					})
				)
			).rejects.toMatchObject({ name: "GuardError" });
		});

		test("signs the existing account in when a provider gives its id, without creating one", async () => {
			await createUser("user@example.com", "user-1");
			AuthenticationProviderFactory.register("3sixty-oauth", () => ({
				className: () => "TestEntityStorageOAuthProvider",
				getCapabilities: () => ({
					type: "oauth2",
					signInMethod: "password",
					passwordChange: "api",
					profileReadOnly: false
				}),
				authenticate: async () => ({
					providerAccountId: "user@example.com",
					accountId: "user-1",
					email: "user@example.com"
				})
			}));
			vi.spyOn(TokenHelper, "createToken").mockResolvedValue({ token: "jwt", expiry: 123 });
			try {
				const service = createService();
				await ContextIdStore.run(NODE_CONTEXT, async () => service.start());

				const login = await ContextIdStore.run(NODE_CONTEXT, async () =>
					service.loginWithProvider("3sixty-oauth", { code: "code-1" })
				);

				expect(login).toMatchObject({ accountId: "user-1", token: "jwt" });
				expect((await userStorage.query()).entities).toHaveLength(1);
				expect((await userStorage.get("user-1"))?.dateLastLogin).toEqual(expect.any(String));
			} finally {
				AuthenticationProviderFactory.unregister("3sixty-oauth");
			}
		});

		test("exchanges a code at the token endpoint once, with its code verifier", async () => {
			await createUser("user@example.com", "user-1");
			const codeVerifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
			const codeChallenge = Converter.bytesToBase64Url(
				Sha256.sum256(Converter.utf8ToBytes(codeVerifier))
			);
			const service = createService();
			await ContextIdStore.run(NODE_CONTEXT, async () => service.start());

			const location = await ContextIdStore.run(PUBLIC_CONTEXT, async () =>
				service.authorize("user@example.com", PASSWORD, { ...AUTHORIZATION, codeChallenge })
			);
			const code = new URL(location).searchParams.get("code") ?? "";

			await expect(
				service.exchangeAuthorizationCode(code, "another-verifier", CALLBACK)
			).rejects.toMatchObject({
				name: "UnauthorizedError",
				message: "entityStorageAuthenticationService.authorizationCodeInvalid"
			});

			// A failed exchange uses the code up, so a guessed verifier cannot be retried.
			await expect(
				service.exchangeAuthorizationCode(code, codeVerifier, CALLBACK)
			).rejects.toMatchObject({ name: "UnauthorizedError" });

			const second = await ContextIdStore.run(PUBLIC_CONTEXT, async () =>
				service.authorize("user@example.com", PASSWORD, { ...AUTHORIZATION, codeChallenge })
			);
			const secondCode = new URL(second).searchParams.get("code") ?? "";
			const token = await ContextIdStore.run(NODE_CONTEXT, async () =>
				service.exchangeAuthorizationCode(secondCode, codeVerifier, CALLBACK)
			);

			expect(Object.entries(token)).toEqual([
				["access_token", "jwt"],
				["token_type", "Bearer"],
				["expires_in", 0]
			]);
			expect((await userStorage.get("user-1"))?.dateLastLogin).toEqual(expect.any(String));
			await expect(
				service.exchangeAuthorizationCode(secondCode, codeVerifier, CALLBACK)
			).rejects.toMatchObject({ name: "UnauthorizedError" });
		});

		test("refuses an exchange for an account disabled after the code was issued", async () => {
			const user = await createUser("user@example.com", "user-1");
			const codeVerifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
			const codeChallenge = Converter.bytesToBase64Url(
				Sha256.sum256(Converter.utf8ToBytes(codeVerifier))
			);
			const service = createService();
			await ContextIdStore.run(NODE_CONTEXT, async () => service.start());
			const location = await ContextIdStore.run(PUBLIC_CONTEXT, async () =>
				service.authorize("user@example.com", PASSWORD, { ...AUTHORIZATION, codeChallenge })
			);
			await userStorage.set({ ...user, dateDisabled: new Date().toISOString() });

			await expect(
				ContextIdStore.run(NODE_CONTEXT, async () =>
					service.exchangeAuthorizationCode(
						new URL(location).searchParams.get("code") ?? "",
						codeVerifier,
						CALLBACK
					)
				)
			).rejects.toMatchObject({ name: "UnauthorizedError" });
		});

		test("sends a code to a registered redirect address on another origin", async () => {
			await createUser("user@example.com", "user-1");
			const appCallback = "https://app.example.com/oauth/callback";
			const service = createService({ config: { authorizationRedirectUris: [appCallback] } });
			await ContextIdStore.run(NODE_CONTEXT, async () => service.start());

			const location = await ContextIdStore.run(PUBLIC_CONTEXT, async () =>
				service.authorize("user@example.com", PASSWORD, {
					...AUTHORIZATION,
					redirectUri: appCallback
				})
			);

			expect(location.startsWith(`${appCallback}?code=`)).toBe(true);
			await expect(
				ContextIdStore.run(PUBLIC_CONTEXT, async () =>
					service.authorize("user@example.com", PASSWORD, {
						...AUTHORIZATION,
						redirectUri: `${appCallback}/other`
					})
				)
			).rejects.toMatchObject({ name: "UnprocessableError" });
		});

		test("gives the authorization server metadata for the public origin", async () => {
			const service = createService({
				config: { authorizationEndpoint: "https://app.example.com/login" }
			});

			const metadata = await ContextIdStore.run(PUBLIC_CONTEXT, async () =>
				service.authorizationServerMetadata()
			);

			expect(Object.entries(metadata)).toEqual([
				["issuer", "https://node.example.com/api"],
				["authorization_endpoint", "https://app.example.com/login"],
				["token_endpoint", "https://node.example.com/api/authentication/token"],
				["response_types_supported", ["code"]],
				["grant_types_supported", ["authorization_code"]],
				["code_challenge_methods_supported", ["S256"]],
				["token_endpoint_auth_methods_supported", ["none"]]
			]);
		});

		test("serves no metadata without an authorization endpoint", async () => {
			const service = createService();

			await expect(
				ContextIdStore.run(PUBLIC_CONTEXT, async () => service.authorizationServerMetadata())
			).rejects.toMatchObject({
				name: "NotFoundError",
				message: "entityStorageAuthenticationService.authorizationServerNotConfigured"
			});
		});

		test("removes expired codes in the cleanup", async () => {
			await codeStorage.set({
				id: "expired",
				accountId: "user-1",
				redirectUri: CALLBACK,
				codeChallenge: "challenge",
				nonce: "nonce",
				expires: new Date(Date.now() - 1000).toISOString(),
				dateCreated: new Date().toISOString()
			});
			const service = createService();
			await ContextIdStore.run(NODE_CONTEXT, async () => service.start());

			for (const [id, callback] of Object.entries(scheduledTasks)) {
				if (id.startsWith("authentication-cleanup")) {
					await callback();
				}
			}

			await expect(codeStorage.get("expired")).resolves.toBeUndefined();
		});
	});
});
