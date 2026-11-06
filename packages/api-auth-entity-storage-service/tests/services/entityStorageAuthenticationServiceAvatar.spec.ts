// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import {
	AuthenticationProviderFactory,
	type IAuthenticationProvider,
	type IAuthenticationRateComponent
} from "@3sixty/api-auth-models";
import { ContextIdKeys, ContextIdStore } from "@3sixty/context";
import { ComponentFactory, RandomHelper } from "@3sixty/core";
import { MemoryEntityStorageConnector } from "@3sixty/entity-storage-connector-memory";
import { EntityStorageConnectorFactory } from "@3sixty/entity-storage-models";
import { nameof } from "@3sixty/nameof";
import { VaultConnectorFactory, type IVaultConnector } from "@3sixty/vault-models";
import { MimeTypes } from "@3sixty/web";
import type { AuthenticationUser } from "../../src/entities/authenticationUser.js";
import { initSchema } from "../../src/schema.js";
import { EntityStorageAuthenticationService } from "../../src/services/entityStorageAuthenticationService.js";
import { TokenHelper } from "../../src/utils/tokenHelper.js";

initSchema();

const AVATAR = {
	"@context": "https://schema.org",
	"@type": "ImageObject",
	encodingFormat: MimeTypes.Png,
	contentUrl: `data:${MimeTypes.Png};base64,AAAA`,
	width: "512",
	height: "512"
};
const STORED = { ...AVATAR, readonlyValue: true };

describe("EntityStorageAuthenticationService provider avatar", () => {
	let userEntityStorage: MemoryEntityStorageConnector<AuthenticationUser>;
	let authenticate: ReturnType<typeof vi.fn>;
	let service: EntityStorageAuthenticationService;
	let logging: { className: () => string; log: ReturnType<typeof vi.fn> };
	let accountAdmin: {
		className: () => string;
		query: ReturnType<typeof vi.fn>;
		create: ReturnType<typeof vi.fn>;
		update: ReturnType<typeof vi.fn>;
		remove: ReturnType<typeof vi.fn>;
	};

	/**
	 * Sign in with the provider, which gives the avatar.
	 * @param avatar The avatar the provider gives, left out when undefined.
	 * @returns The result of the sign in.
	 */
	async function signIn(
		avatar: unknown
	): ReturnType<EntityStorageAuthenticationService["loginWithProvider"]> {
		authenticate.mockResolvedValue({
			providerAccountId: "google-subject-1",
			email: "user@example.com",
			avatar
		});
		return service.loginWithProvider("google", { code: "code-1" });
	}

	/**
	 * Make the account hold avatar items.
	 * @param items The items.
	 */
	function holds(items: { id: string; isDefault: boolean; data: unknown }[]): void {
		accountAdmin.query.mockImplementation(async (accountId: string, type: string) => ({
			entities: type === "avatar" ? items : []
		}));
	}

	beforeEach(async () => {
		vi.restoreAllMocks();

		const rateService: IAuthenticationRateComponent = {
			className: vi.fn().mockReturnValue("AuthenticationRateService"),
			start: vi.fn(),
			stop: vi.fn(),
			registerAction: vi.fn(),
			unregisterAction: vi.fn(),
			check: vi.fn(),
			clear: vi.fn()
		};
		logging = { className: () => "logging", log: vi.fn() };
		accountAdmin = {
			className: () => "accountAdmin",
			query: vi.fn().mockResolvedValue({ entities: [] }),
			create: vi.fn().mockResolvedValue("avatar-1"),
			update: vi.fn().mockResolvedValue(undefined),
			remove: vi.fn().mockResolvedValue(undefined)
		};
		userEntityStorage = new MemoryEntityStorageConnector<AuthenticationUser>({
			entitySchema: nameof<AuthenticationUser>(),
			config: { storageKey: "authentication-user-avatar" }
		});
		vi.spyOn(EntityStorageConnectorFactory, "get").mockReturnValue(userEntityStorage);
		const vaultConnector = { get: vi.fn() } as unknown as IVaultConnector;
		vi.spyOn(VaultConnectorFactory, "get").mockReturnValue(vaultConnector);
		vi.spyOn(ComponentFactory, "get").mockImplementation(componentName => {
			if (componentName === "authentication-rate") {
				return rateService;
			}
			if (componentName === "authorization") {
				return {
					className: () => "authorization",
					addRoleForSubject: vi.fn(),
					getRolesForSubject: vi.fn().mockResolvedValue(["user"])
				};
			}
			if (componentName === "authentication-account-admin") {
				return accountAdmin;
			}
			if (componentName === "authentication-audit") {
				return { className: () => "audit", create: vi.fn() };
			}
			if (
				componentName === "authentication-account" ||
				componentName === "organization-request-admin"
			) {
				return { className: () => componentName };
			}
			if (componentName === "task-scheduler") {
				return { className: () => componentName, addTask: vi.fn(), removeTask: vi.fn() };
			}
			if (componentName === "messaging") {
				return { className: () => componentName, sendCustomEmail: vi.fn() };
			}
			if (componentName === "platform") {
				return {
					className: () => componentName,
					execute: vi.fn(async (method: () => Promise<void>) => method())
				};
			}
			throw new Error(`Unexpected component ${componentName}`);
		});
		vi.spyOn(ComponentFactory, "getIfExists").mockImplementation(componentName => {
			if (componentName === "logging") {
				return logging;
			}
			return undefined;
		});

		authenticate = vi.fn();
		AuthenticationProviderFactory.register("google", () => ({
			className: () => "TestGoogleProvider",
			getCapabilities: () => ({
				type: "oauth2",
				signInMethod: "redirect",
				passwordChange: "external",
				profileReadOnly: true
			}),
			authenticate: authenticate as IAuthenticationProvider["authenticate"]
		}));
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({ [ContextIdKeys.Node]: "node-1" });
		vi.spyOn(TokenHelper, "createToken").mockResolvedValue({ token: "jwt-token", expiry: 1 });
		vi.spyOn(RandomHelper, "generateUuidV7").mockReturnValue("account-1");

		service = new EntityStorageAuthenticationService({
			config: {
				emailSender: "noreply@example.com",
				passwordResetUrl: "https://app.example.com/reset",
				registrationVerificationUrl: "https://app.example.com/verify"
			}
		});
		await service.start();
	});

	afterEach(async () => {
		AuthenticationProviderFactory.unregister("google");
		await userEntityStorage.teardown();
	});

	it("should store the provider photo as a read only default avatar", async () => {
		await expect(signIn(AVATAR)).resolves.toMatchObject({ accountId: "account-1" });

		expect(accountAdmin.query).toHaveBeenCalledWith("account-1", "avatar");
		expect(accountAdmin.create).toHaveBeenCalledWith("account-1", "avatar", STORED, true);
	});

	it("should only write the avatar when the photo changed", async () => {
		holds([{ id: "avatar-1", isDefault: true, data: STORED }]);
		await signIn(AVATAR);
		expect(accountAdmin.create).not.toHaveBeenCalled();
		expect(accountAdmin.update).not.toHaveBeenCalled();

		const changed = { ...AVATAR, contentUrl: `data:${MimeTypes.Png};base64,BBBB` };
		await signIn(changed);
		expect(accountAdmin.update).toHaveBeenCalledWith(
			"avatar-1",
			{ ...changed, readonlyValue: true },
			true
		);

		// An avatar the account uploaded is replaced, as the provider owns the avatar.
		holds([
			{ id: "uploaded", isDefault: true, data: { ...AVATAR, encodingFormat: MimeTypes.Jpeg } }
		]);
		await signIn(AVATAR);
		expect(accountAdmin.update).toHaveBeenLastCalledWith("uploaded", STORED, true);
	});

	it("should remove the avatar the provider stored when it holds no photo", async () => {
		holds([
			{ id: "provider", isDefault: true, data: STORED },
			{ id: "uploaded", isDefault: false, data: AVATAR }
		]);

		await signIn(null);

		expect(accountAdmin.remove).toHaveBeenCalledTimes(1);
		expect(accountAdmin.remove).toHaveBeenCalledWith("provider");
		expect(accountAdmin.create).not.toHaveBeenCalled();
	});

	it("should keep the avatar when the photo is not known", async () => {
		holds([{ id: "provider", isDefault: true, data: STORED }]);

		await signIn(undefined);

		expect(accountAdmin.query).not.toHaveBeenCalledWith("account-1", "avatar");
		expect(accountAdmin.create).not.toHaveBeenCalled();
		expect(accountAdmin.update).not.toHaveBeenCalled();
		expect(accountAdmin.remove).not.toHaveBeenCalled();
	});

	it("should sign in and log when the avatar can not be stored", async () => {
		accountAdmin.create.mockRejectedValue(new Error("storage down"));

		await expect(signIn(AVATAR)).resolves.toMatchObject({
			accountId: "account-1",
			token: "jwt-token"
		});

		expect(logging.log).toHaveBeenCalledWith(
			expect.objectContaining({
				level: "warn",
				source: EntityStorageAuthenticationService.CLASS_NAME,
				message: "providerAvatarFailed",
				data: { accountId: "account-1" }
			})
		);
	});
});
