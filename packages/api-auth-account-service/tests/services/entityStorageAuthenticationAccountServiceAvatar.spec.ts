// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { AuthenticationAccountHelper } from "@3sixty/api-auth-models";
import { ContextIdKeys, ContextIdStore } from "@3sixty/context";
import { ComponentFactory, Converter } from "@3sixty/core";
import { MemoryEntityStorageConnector } from "@3sixty/entity-storage-connector-memory";
import { EntityStorageConnectorFactory } from "@3sixty/entity-storage-models";
import { nameof } from "@3sixty/nameof";
import { MimeTypes } from "@3sixty/web";
import type { AccountData } from "../../src/entities/accountData.js";
import type { OrganizationRequest } from "../../src/entities/organizationRequest.js";
import { initSchema } from "../../src/schema.js";
import { EntityStorageAuthenticationAccountAdminService } from "../../src/services/entityStorageAuthenticationAccountAdminService.js";
import { EntityStorageAuthenticationAccountService } from "../../src/services/entityStorageAuthenticationAccountService.js";
import { AccountDataHelper } from "../../src/utils/accountDataHelper.js";
import { createFakeIdentityComponent } from "../helpers/fakeIdentityComponent.js";
import {
	createOrganizationStorage,
	createRateComponent,
	createRoleAuthorizationComponent,
	createUserStorage,
	mockRequiredComponents,
	registerAccountDataVerifiers
} from "../helpers/testDependencies.js";

initSchema();

/**
 * Run a function as a signed in account.
 * @param accountId The account id.
 * @param fn The function to run.
 * @returns The result of the function.
 */
async function asAccount<T>(accountId: string, fn: () => Promise<T>): Promise<T> {
	return ContextIdStore.run({ [ContextIdKeys.Account]: accountId }, fn);
}

/**
 * Build an avatar holding a number of bytes.
 * @param size The number of bytes.
 * @param overrides Properties to change.
 * @returns The avatar.
 */
function avatar(
	size: number = 16,
	overrides: { [key: string]: unknown } = {}
): {
	[key: string]: unknown;
} {
	return {
		"@context": "https://schema.org",
		"@type": "ImageObject",
		encodingFormat: MimeTypes.Jpeg,
		contentUrl: `data:${MimeTypes.Jpeg};base64,${Converter.bytesToBase64(new Uint8Array(size).fill(1))}`,
		width: "512",
		height: "512",
		...overrides
	};
}

const INVALID = { name: "UnprocessableError", message: "accountDataHelper.avatarInvalid" };
const READ_ONLY = {
	name: "ForbiddenError",
	message: "entityStorageAuthenticationAccountService.readOnly"
};

describe("EntityStorageAuthenticationAccountService avatar", () => {
	beforeAll(() => {
		registerAccountDataVerifiers();
	});

	let storage: MemoryEntityStorageConnector<AccountData>;
	let requests: MemoryEntityStorageConnector<OrganizationRequest>;
	let service: EntityStorageAuthenticationAccountService;
	let admin: EntityStorageAuthenticationAccountAdminService;

	beforeEach(async () => {
		storage = new MemoryEntityStorageConnector<AccountData>({
			entitySchema: nameof<AccountData>(),
			config: { storageKey: "account-data-avatar" }
		});
		requests = new MemoryEntityStorageConnector<OrganizationRequest>({
			entitySchema: nameof<OrganizationRequest>(),
			config: { storageKey: "organization-request-avatar" }
		});
		const organizations = await createOrganizationStorage("organization-avatar");
		const users = createUserStorage();
		vi.spyOn(EntityStorageConnectorFactory, "get").mockImplementation(name => {
			if (name === "organization-request") {
				return requests as never;
			}
			if (name === "organization") {
				return organizations as never;
			}
			return (name === "authentication-user" ? users : storage) as never;
		});
		vi.spyOn(ComponentFactory, "getIfExists").mockReturnValue(undefined);
		mockRequiredComponents({
			authorization: createRoleAuthorizationComponent({ "admin-1": ["global-admin"] }),
			"identity-service": createFakeIdentityComponent(),
			"authentication-rate": createRateComponent()
		});
		service = new EntityStorageAuthenticationAccountService();
		admin = new EntityStorageAuthenticationAccountAdminService();
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		await storage.teardown();
		await requests.teardown();
	});

	it("should store, replace and remove an uploaded avatar", async () => {
		await asAccount("account-1", async () => {
			const id = await service.create("avatar", avatar(), true);
			await expect(service.get(id)).resolves.toMatchObject({
				type: "avatar",
				data: avatar(),
				isDefault: true
			});

			// The size is optional.
			const unsized = avatar(32);
			delete unsized.width;
			delete unsized.height;
			await service.update(id, unsized);
			await expect(service.get(id)).resolves.toMatchObject({ data: unsized });

			await service.remove(id);
			await expect(service.query("avatar")).resolves.toMatchObject({ entities: [] });
		});
	});

	it("should refuse an avatar that is not a JPEG ImageObject with a base64 data URL", async () => {
		const pngUrl = `data:${MimeTypes.Png};base64,${Converter.bytesToBase64(new Uint8Array(4))}`;
		const invalid: unknown[] = [
			`data:${MimeTypes.Jpeg};base64,AAAA`,
			[avatar()],
			avatar(16, { "@type": "Photograph" }),
			avatar(16, { "@type": undefined }),
			avatar(16, { encodingFormat: MimeTypes.Png, contentUrl: pngUrl }),
			avatar(16, { encodingFormat: MimeTypes.Png }),
			avatar(16, { contentUrl: pngUrl }),
			avatar(16, { contentUrl: "https://example.com/avatar.jpg" }),
			avatar(16, { contentUrl: `data:${MimeTypes.Jpeg};base64,not base64!` }),
			avatar(16, { contentUrl: `data:${MimeTypes.Jpeg};base64,AAA` }),
			avatar(16, { contentUrl: `data:${MimeTypes.Jpeg};base64,` }),
			avatar(16, { contentUrl: undefined }),
			avatar(16, { width: 512 }),
			avatar(16, { width: 0 }),
			avatar(16, { height: 1025 }),
			avatar(16, { width: "0" }),
			avatar(16, { width: "0512" }),
			avatar(16, { width: "1.5" }),
			avatar(16, { width: "512px" }),
			avatar(16, { height: "1025" }),
			avatar(16, { height: "" })
		];

		await asAccount("account-1", async () => {
			for (const data of invalid) {
				await expect(service.create("avatar", data)).rejects.toMatchObject(INVALID);
			}
			// Types are matched once normalised.
			await expect(service.create("Avatar", avatar(16, { width: 0 }))).rejects.toMatchObject(
				INVALID
			);
			// The account may not mark its own avatar read only to take the provider limits.
			await expect(
				service.create("avatar", AuthenticationAccountHelper.markReadOnly(avatar()))
			).rejects.toMatchObject(INVALID);

			const id = await service.create("avatar", avatar(16, { width: "1024", height: "1" }));
			await expect(service.update(id, avatar(16, { width: "2048" }))).rejects.toMatchObject(
				INVALID
			);
			await expect(service.get(id)).resolves.toMatchObject({ data: { width: "1024" } });
			// A number is refused, schema.org gives the size as text.
			await expect(
				service.update(id, avatar(16, { width: 512, height: 512 }))
			).rejects.toMatchObject(INVALID);
		});
	});

	it("should refuse an avatar larger than 256 KiB", async () => {
		await asAccount("account-1", async () => {
			const id = await service.create("avatar", avatar(AccountDataHelper.AVATAR_MAX_BYTES));
			for (const write of [
				async () => service.create("avatar", avatar(AccountDataHelper.AVATAR_MAX_BYTES + 1)),
				async () => service.update(id, avatar(AccountDataHelper.AVATAR_MAX_BYTES + 1))
			]) {
				await expect(write()).rejects.toMatchObject({
					name: "UnprocessableError",
					message: "accountDataHelper.avatarTooLarge",
					properties: { maxBytes: 262144 }
				});
			}
		});
	});

	it("should check an avatar written through the admin service", async () => {
		await expect(
			admin.create("account-1", "avatar", avatar(16, { width: 0 }))
		).rejects.toMatchObject(INVALID);
		await expect(
			admin.create("account-1", "avatar", avatar(AccountDataHelper.AVATAR_MAX_BYTES + 1))
		).rejects.toMatchObject({ message: "accountDataHelper.avatarTooLarge" });

		const id = await admin.create("account-1", "avatar", avatar(), true);
		await expect(admin.update(id, { name: "Alice" })).rejects.toMatchObject(INVALID);

		// An avatar owned by the provider may keep the provider's content type and be larger.
		const pngBytes = Converter.bytesToBase64(
			new Uint8Array(AccountDataHelper.AVATAR_MAX_BYTES + 1)
		);
		const providerAvatar = AuthenticationAccountHelper.markReadOnly(
			avatar(16, {
				encodingFormat: MimeTypes.Png,
				contentUrl: `data:${MimeTypes.Png};base64,${pngBytes}`
			})
		);
		await expect(admin.update(id, providerAvatar, true)).resolves.toBeUndefined();
		await expect(
			admin.update(
				id,
				AuthenticationAccountHelper.markReadOnly(
					avatar(16, {
						encodingFormat: MimeTypes.Gif,
						contentUrl: `data:${MimeTypes.Gif};base64,AAAA`
					})
				)
			)
		).rejects.toMatchObject(INVALID);
		await expect(
			admin.update(
				id,
				AuthenticationAccountHelper.markReadOnly(
					avatar(AccountDataHelper.PROVIDER_AVATAR_MAX_BYTES + 1)
				)
			)
		).rejects.toMatchObject({
			message: "accountDataHelper.avatarTooLarge",
			properties: { maxBytes: 1048576 }
		});
	});

	it("should not let the account replace or remove an avatar owned by the provider", async () => {
		const providerId = await admin.create(
			"account-1",
			"avatar",
			AuthenticationAccountHelper.markReadOnly(avatar()),
			true
		);

		await asAccount("account-1", async () => {
			await expect(service.update(providerId, avatar(32))).rejects.toMatchObject(READ_ONLY);
			await expect(service.remove(providerId)).rejects.toMatchObject(READ_ONLY);
			await expect(service.create("avatar", avatar(32), true)).rejects.toMatchObject(READ_ONLY);
			await expect(service.create("avatar", avatar(32))).rejects.toMatchObject(READ_ONLY);
		});
		await expect(admin.get(providerId)).resolves.toMatchObject({
			data: AuthenticationAccountHelper.markReadOnly(avatar())
		});
	});

	it("should keep one avatar per account, a new one replacing it as the default", async () => {
		const id = await asAccount("account-1", async () => {
			const first = await service.create("avatar", avatar());
			await expect(service.create("avatar", avatar(32))).resolves.toBe(first);
			return first;
		});
		await expect(admin.create("account-1", "avatar", avatar(48), false)).resolves.toBe(id);
		await expect(admin.query("account-1", "avatar")).resolves.toMatchObject({
			entities: [{ id, data: avatar(48), isDefault: true }]
		});

		// Avatars stored before there was one per account are reduced to the default.
		const now = new Date().toISOString();
		await storage.set({
			id: "extra-avatar",
			accountId: "account-1",
			type: "avatar",
			data: avatar(8),
			isDefault: false,
			dateCreated: now,
			dateModified: now
		});
		await asAccount("account-1", async () => {
			await expect(service.create("avatar", avatar(64))).resolves.toBe(id);
			await expect(service.query("avatar")).resolves.toMatchObject({
				entities: [{ id, data: avatar(64), isDefault: true }]
			});
		});
	});

	it("should not count a replaced avatar against the item limits", async () => {
		service = new EntityStorageAuthenticationAccountService({ config: { maxItems: 1 } });
		await asAccount("account-1", async () => {
			const id = await service.create("avatar", avatar());
			await expect(service.create("avatar", avatar(32))).resolves.toBe(id);
		});
	});

	it("should not let an admin replace, change or remove an avatar owned by the provider", async () => {
		const providerAvatar = AuthenticationAccountHelper.markReadOnly(avatar());
		const providerId = await admin.create("account-1", "avatar", providerAvatar, true);
		const adminReadOnly = {
			name: "ForbiddenError",
			message: "entityStorageAuthenticationAccountAdminService.readOnly",
			properties: { type: "avatar" }
		};

		await asAccount("admin-1", async () => {
			await expect(admin.update(providerId, avatar(32))).rejects.toMatchObject(adminReadOnly);
			await expect(admin.remove(providerId)).rejects.toMatchObject(adminReadOnly);
			await expect(admin.create("account-1", "avatar", avatar(32))).rejects.toMatchObject(
				adminReadOnly
			);
		});
		await expect(admin.get(providerId)).resolves.toMatchObject({ data: providerAvatar });

		// The authentication service stores the avatar of the provider as a system call.
		const updated = AuthenticationAccountHelper.markReadOnly(avatar(32));
		await admin.update(providerId, updated, true);
		await expect(admin.get(providerId)).resolves.toMatchObject({ data: updated });
		await admin.remove(providerId);
		await expect(admin.query("account-1", "avatar")).resolves.toMatchObject({ entities: [] });
	});

	it("should export an uploaded avatar and import it again, checking it", async () => {
		await asAccount("account-1", async () => {
			await service.create("avatar", avatar(), true);
			const exported = await service.exportProfile();
			expect(exported.items).toEqual([
				{ type: "avatar", data: avatar(), isDefault: true, dateCreated: expect.any(String) }
			]);

			await expect(
				service.importProfile({
					type: "account-profile",
					version: 1,
					items: [{ type: "avatar", data: avatar(16, { encodingFormat: MimeTypes.Png }) }]
				})
			).rejects.toMatchObject(INVALID);
			await expect(
				service.importProfile({
					type: "account-profile",
					version: 1,
					items: [{ type: "avatar", data: avatar(AccountDataHelper.AVATAR_MAX_BYTES + 1) }]
				})
			).rejects.toMatchObject({ message: "accountDataHelper.avatarTooLarge" });
			// A refused import leaves the existing avatar.
			await expect(service.query("avatar")).resolves.toMatchObject({
				entities: [{ data: avatar() }]
			});

			await expect(
				service.importProfile({
					type: "account-profile",
					version: 1,
					items: [{ type: "avatar", data: avatar(32), isDefault: true }]
				})
			).resolves.toEqual({ itemsImported: 1, itemsRemoved: 1, skippedTypes: [] });
			await expect(service.query("avatar")).resolves.toMatchObject({
				entities: [{ data: avatar(32), isDefault: true }]
			});
		});
	});

	it("should keep an avatar owned by the provider through an import", async () => {
		const providerAvatar = AuthenticationAccountHelper.markReadOnly(avatar());
		await admin.create("account-1", "avatar", providerAvatar, true);

		await asAccount("account-1", async () => {
			const exported = await service.exportProfile();
			expect(exported.items.map(item => item.data)).toEqual([providerAvatar]);

			await expect(
				service.importProfile({
					type: "account-profile",
					version: 1,
					items: [
						{ type: "avatar", data: avatar(32), isDefault: true },
						{ type: "address", data: { line: "1" } }
					]
				})
			).resolves.toEqual({ itemsImported: 1, itemsRemoved: 0, skippedTypes: ["avatar"] });
			await expect(service.query("avatar")).resolves.toMatchObject({
				entities: [{ data: providerAvatar }]
			});
		});

		// A provider avatar in an export is left out on an account without one.
		const exported = await asAccount("account-1", async () => service.exportProfile());
		await asAccount("account-2", async () => {
			await expect(service.importProfile(exported)).resolves.toEqual({
				itemsImported: 1,
				itemsRemoved: 0,
				skippedTypes: ["avatar"]
			});
			await expect(service.query("avatar")).resolves.toMatchObject({ entities: [] });
		});
	});
});
