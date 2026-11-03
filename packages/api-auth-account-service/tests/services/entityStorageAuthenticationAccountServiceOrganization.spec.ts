// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { ContextIdKeys, ContextIdStore } from "@3sixty/context";
import { ComponentFactory, DurationConstants } from "@3sixty/core";
import { MemoryEntityStorageConnector } from "@3sixty/entity-storage-connector-memory";
import { EntityStorageConnectorFactory } from "@3sixty/entity-storage-models";
import { nameof } from "@3sixty/nameof";
import { MimeTypes } from "@3sixty/web";
import type { AccountData } from "../../src/entities/accountData.js";
import type { Organization } from "../../src/entities/organization.js";
import type { OrganizationRequest } from "../../src/entities/organizationRequest.js";
import { initSchema } from "../../src/schema.js";
import { EntityStorageAuthenticationAccountAdminService } from "../../src/services/entityStorageAuthenticationAccountAdminService.js";
import { EntityStorageAuthenticationAccountService } from "../../src/services/entityStorageAuthenticationAccountService.js";
import { EntityStorageOrganizationService } from "../../src/services/entityStorageOrganizationService.js";
import { AccountDataHelper } from "../../src/utils/accountDataHelper.js";
import { AdminScopeHelper } from "../../src/utils/adminScopeHelper.js";
import { OrganizationHelper } from "../../src/utils/organizationHelper.js";
import { OrganizationMembershipHelper } from "../../src/utils/organizationMembershipHelper.js";
import { organizationData } from "../helpers/accountDataValues.js";
import {
	createFakeIdentityComponent,
	type IFakeIdentityComponent
} from "../helpers/fakeIdentityComponent.js";
import {
	createRateComponent,
	createRoleAuthorizationComponent,
	createUserStorage
} from "../helpers/testDependencies.js";

initSchema();

const NODE = "did:example:node";

const PROFILE = {
	"@context": "https://schema.org",
	"@type": "Organization",
	name: "Example Ltd",
	email: "office@example.com",
	address: {
		"@type": "PostalAddress",
		streetAddress: "1 High Street",
		addressLocality: "London"
	}
};

const LOGO = {
	"@context": "https://schema.org",
	"@type": "ImageObject",
	encodingFormat: MimeTypes.Png,
	contentUrl: `data:${MimeTypes.Png};base64,iVBORw0KGgo=`
};

/**
 * Get the current time in seconds, a session that started now is recent.
 * @returns The time.
 */
function nowSeconds(): number {
	return Math.floor(Date.now() / DurationConstants.MsPerSecond);
}

/**
 * Run a function as a signed in account, or as the system when no account is given.
 * @param accountId The account id.
 * @param fn The function to run.
 * @returns The result of the function.
 */
async function run<T>(accountId: string | undefined, fn: () => Promise<T>): Promise<T> {
	return ContextIdStore.run({ [ContextIdKeys.Node]: NODE, [ContextIdKeys.Account]: accountId }, fn);
}

describe("organizations created by an account and their org admins", () => {
	let accountData: MemoryEntityStorageConnector<AccountData>;
	let requests: MemoryEntityStorageConnector<OrganizationRequest>;
	let organizations: MemoryEntityStorageConnector<Organization>;
	let identityComponent: IFakeIdentityComponent;
	let roles: { [subject: string]: string[] };
	let service: EntityStorageAuthenticationAccountService;
	let admin: EntityStorageAuthenticationAccountAdminService;
	let organizationService: EntityStorageOrganizationService;

	beforeEach(() => {
		accountData = new MemoryEntityStorageConnector<AccountData>({
			entitySchema: nameof<AccountData>(),
			config: { storageKey: "account-data-own-organization" }
		});
		requests = new MemoryEntityStorageConnector<OrganizationRequest>({
			entitySchema: nameof<OrganizationRequest>(),
			config: { storageKey: "organization-request-own-organization" }
		});
		organizations = new MemoryEntityStorageConnector<Organization>({
			entitySchema: nameof<Organization>(),
			config: { storageKey: "organization-own-organization" }
		});
		EntityStorageConnectorFactory.register("account-data", () => accountData);
		EntityStorageConnectorFactory.register("organization-request", () => requests);
		EntityStorageConnectorFactory.register("organization", () => organizations);
		const userStorage = createUserStorage();
		EntityStorageConnectorFactory.register("authentication-user", () => userStorage);
		identityComponent = createFakeIdentityComponent();
		roles = { "global-1": ["global-admin"] };
		const authorization = createRoleAuthorizationComponent(roles);
		const rate = createRateComponent();
		ComponentFactory.register("identity-service", () => identityComponent);
		ComponentFactory.register("authentication-rate", () => rate);
		ComponentFactory.register("authorization", () => authorization);

		service = new EntityStorageAuthenticationAccountService();
		admin = new EntityStorageAuthenticationAccountAdminService();
		organizationService = new EntityStorageOrganizationService();
	});

	afterEach(async () => {
		ComponentFactory.unregister("identity-service");
		ComponentFactory.unregister("authentication-rate");
		ComponentFactory.unregister("authorization");
		EntityStorageConnectorFactory.unregister("account-data");
		EntityStorageConnectorFactory.unregister("organization-request");
		EntityStorageConnectorFactory.unregister("organization");
		EntityStorageConnectorFactory.unregister("authentication-user");
		await accountData.teardown();
		await requests.teardown();
		await organizations.teardown();
	});

	/**
	 * Give an account a node held identity.
	 * @param accountId The account id.
	 * @returns The DID.
	 */
	async function withIdentity(accountId: string): Promise<string> {
		return run(accountId, async () => service.adoptIdentity(undefined, undefined, nowSeconds()));
	}

	/**
	 * Create an organization for an account through self-service.
	 * @param accountId The account id.
	 * @returns The DID of the organization.
	 */
	async function createOwn(accountId: string): Promise<string> {
		await withIdentity(accountId);
		const created = await run(accountId, async () =>
			service.createOrganization({
				profile: PROFILE,
				logo: LOGO,
				publicData: ["profile.name", "profile.address.addressLocality", "logo"]
			})
		);
		return created.identity;
	}

	/**
	 * Add an account with an identity to an organization, as an accepted request does.
	 * @param accountId The account id.
	 * @param organization The DID of the organization.
	 */
	async function addMember(accountId: string, organization: string): Promise<void> {
		await withIdentity(accountId);
		await run(undefined, async () =>
			admin.create(accountId, "organization", organizationData(organization))
		);
	}

	describe("self-service create", () => {
		it("should create an organization with the caller as its member, with a credential, and org admin", async () => {
			const identity = await withIdentity("account-1");

			const created = await run("account-1", async () =>
				service.createOrganization({ profile: PROFILE, logo: LOGO, publicData: ["profile.name"] })
			);

			expect(created).toMatchObject({
				profile: PROFILE,
				logo: LOGO,
				publicData: ["profile.name"],
				isAdmin: true
			});
			expect(created.identity).toMatch(/^did:/);
			// The DID is held by the node, which controls it.
			expect(identityComponent.identityCreate).toHaveBeenLastCalledWith(undefined, NODE);
			expect(identityComponent.held.has(created.identity)).toBe(true);
			// An org admin is given the member admin role with it.
			expect(roles["account-1"]).toEqual([`org-admin:${created.identity}`, "user-admin"]);
			await expect(run("account-1", async () => service.getOrganization())).resolves.toBe(
				created.identity
			);
			await expect(
				OrganizationMembershipHelper.hasCredential(
					accountData,
					identityComponent,
					"account-1",
					created.identity,
					{ identity }
				)
			).resolves.toBe(true);
			// The credential can be revoked, as it carries the first revocation index.
			const organizationItem = await AccountDataHelper.getDefault(
				accountData,
				"account-1",
				"organization"
			);
			await expect(
				AccountDataHelper.getRevocationIndex(accountData, organizationItem?.id ?? "")
			).resolves.toBe(0);
			await expect(
				run("account-1", async () => organizationService.get(created.identity))
			).resolves.toMatchObject({ profile: PROFILE, isAdmin: true });
			await expect(
				run("account-2", async () => organizationService.search("exam"))
			).resolves.toMatchObject({
				entities: [
					{
						public: [
							{
								"@context": "https://schema.org",
								"@type": "Organization",
								name: "Example Ltd",
								identifier: created.identity
							}
						]
					}
				]
			});
		});

		it("should refuse an account without an identity, with an organization or a pending request", async () => {
			await expect(
				run("account-1", async () => service.createOrganization({}))
			).rejects.toMatchObject({
				name: "UnprocessableError",
				message: "entityStorageAuthenticationAccountService.identityRequired"
			});

			const organization = await createOwn("account-2");
			await expect(
				run("account-2", async () => service.createOrganization({}))
			).rejects.toMatchObject({
				name: "ConflictError",
				message: "entityStorageAuthenticationAccountService.organizationAlreadyJoined",
				properties: { conflictId: organization }
			});

			await withIdentity("account-3");
			await run("account-3", async () => service.joinOrganization(organization));
			await expect(
				run("account-3", async () => service.createOrganization({}))
			).rejects.toMatchObject({
				name: "ConflictError",
				message: "entityStorageAuthenticationAccountService.organizationRequestPending"
			});

			await withIdentity("account-4");
			await expect(
				run("account-4", async () => service.createOrganization({ publicData: ["Bad Path"] }))
			).rejects.toMatchObject({ message: "publicDataHelper.publicDataInvalid" });
			expect(identityComponent.identityCreate).toHaveBeenCalledTimes(4);
		});

		it("should remove everything it created when a step fails", async () => {
			await withIdentity("account-1");
			vi.mocked(identityComponent.verifiableCredentialCreate).mockRejectedValueOnce(
				new Error("signing failed")
			);

			await expect(
				run("account-1", async () => service.createOrganization({ profile: PROFILE }))
			).rejects.toMatchObject({
				name: "GeneralError",
				message: "entityStorageAuthenticationAccountService.organizationCreateFailed"
			});

			expect((await organizations.query()).entities).toHaveLength(0);
			// Only the identity of the account is left.
			expect(identityComponent.held.size).toBe(1);
			expect(roles["account-1"] ?? []).toEqual([]);
			await expect(
				run("account-1", async () => service.getOrganization())
			).resolves.toBeUndefined();
		});

		/**
		 * Create an organization on the node, export its identity and remove it again, as an
		 * organization moved from another node is.
		 * @param revocationIndexes How many revocation indexes it allocated before the export.
		 * @returns The export.
		 */
		async function exportedElsewhere(
			revocationIndexes: number
		): Promise<Awaited<ReturnType<EntityStorageOrganizationService["exportIdentity"]>>> {
			const created = await run(undefined, async () => organizationService.create({}));
			for (let i = 0; i < revocationIndexes; i++) {
				await OrganizationHelper.allocateRevocationIndex(organizations, created.identity);
			}
			const file = await run(undefined, async () => organizationService.exportIdentity(created.id));
			await run(undefined, async () => organizationService.remove(created.id));
			identityComponent.held.delete(created.identity);
			// The node never kept a removed index, as on another node.
			await accountData.remove(OrganizationHelper.retiredRevocationIndexId(created.identity));
			return file;
		}

		it("should create an organization from an identity export, keeping its DID and revocation index", async () => {
			const file = await exportedElsewhere(2);
			await withIdentity("account-1");

			const created = await run("account-1", async () =>
				service.createOrganization({ identityImport: file, profile: PROFILE })
			);

			expect(created).toMatchObject({
				identity: file.identity.document.id,
				profile: PROFILE,
				isAdmin: true
			});
			expect(identityComponent.identityImport).toHaveBeenCalledWith(file.identity, NODE);
			expect(identityComponent.held.has(created.identity)).toBe(true);
			expect(roles["account-1"]).toEqual([`org-admin:${created.identity}`, "user-admin"]);
			// The membership credential carries on from the index the export reached.
			const organizationItem = await AccountDataHelper.getDefault(
				accountData,
				"account-1",
				"organization"
			);
			await expect(
				AccountDataHelper.getRevocationIndex(accountData, organizationItem?.id ?? "")
			).resolves.toBe(2);
		});

		it("should refuse another kind of file before anything else", async () => {
			const file = await exportedElsewhere(0);

			for (const [identityImport, message] of [
				[{ ...file, type: "account-identity" }, "exportFileHelper.fileTypeMismatch"],
				[{ ...file, version: 2 }, "exportFileHelper.fileVersionUnsupported"],
				[
					{ ...file, nextRevocationIndex: -1 },
					"entityStorageAuthenticationAccountService.nextRevocationIndexInvalid"
				]
			] as const) {
				// Refused even to an account without an identity, as nothing else is checked first.
				await expect(
					run("account-1", async () =>
						service.createOrganization({ identityImport: identityImport as never })
					)
				).rejects.toMatchObject({ name: "UnprocessableError", message });
			}
			expect(identityComponent.identityImport).not.toHaveBeenCalled();
			expect((await organizations.query()).entities).toHaveLength(0);
		});

		it("should refuse an identity export of an organization already registered", async () => {
			const registered = await run(undefined, async () => organizationService.create({}));
			const file = await run(undefined, async () =>
				organizationService.exportIdentity(registered.id)
			);
			await withIdentity("account-1");

			await expect(
				run("account-1", async () => service.createOrganization({ identityImport: file }))
			).rejects.toMatchObject({
				name: "ConflictError",
				message: "entityStorageAuthenticationAccountService.organizationExists"
			});
			expect(identityComponent.identityImport).not.toHaveBeenCalled();
			expect(roles["account-1"] ?? []).toEqual([]);
		});
	});

	describe("members and org admins", () => {
		it("should list the members with their names and whether they are org admins", async () => {
			const organization = await createOwn("account-1");
			await addMember("account-2", organization);
			await run(undefined, async () =>
				admin.create("account-2", "profile", {
					"@context": "https://schema.org",
					"@type": "Person",
					givenName: "Bob",
					familyName: "Smith",
					email: "bob@example.com"
				})
			);

			const asMember = await run("account-2", async () =>
				organizationService.queryMembers(organization)
			);
			expect(asMember.entities).toEqual([
				{ accountId: "account-1", isAdmin: true },
				{ accountId: "account-2", name: "Bob Smith", email: "bob@example.com", isAdmin: false }
			]);
			await expect(
				run("global-1", async () => organizationService.queryMembers(organization, undefined, 1))
			).resolves.toMatchObject({
				entities: [{ accountId: "account-1" }],
				cursor: expect.any(String)
			});
			await expect(
				run("outsider", async () => organizationService.queryMembers(organization))
			).rejects.toMatchObject({ name: "ForbiddenError" });
		});

		it("should grant and revoke org admin, keeping the last org admin unless a global admin revokes", async () => {
			const organization = await createOwn("account-1");
			await addMember("account-2", organization);

			await expect(
				run("account-2", async () => organizationService.addAdmin(organization, "account-2"))
			).rejects.toMatchObject({ name: "ForbiddenError" });
			await expect(
				run("account-1", async () => organizationService.addAdmin(organization, "outsider"))
			).rejects.toMatchObject({
				name: "NotFoundError",
				message: "entityStorageOrganizationService.organizationMemberNotFound"
			});

			await run("account-1", async () => organizationService.addAdmin(organization, "account-2"));
			expect(roles["account-2"]).toContain(`org-admin:${organization}`);
			await run("account-2", async () =>
				organizationService.removeAdmin(organization, "account-1")
			);
			expect(roles["account-1"]).not.toContain(`org-admin:${organization}`);

			await expect(
				run("account-2", async () => organizationService.removeAdmin(organization, "account-2"))
			).rejects.toMatchObject({
				name: "ConflictError",
				message: "entityStorageOrganizationService.organizationLastAdmin"
			});
			await run("global-1", async () => organizationService.removeAdmin(organization, "account-2"));
			expect(roles["account-2"]).not.toContain(`org-admin:${organization}`);
		});

		it("should remove the org admin role when the membership ends", async () => {
			const organization = await createOwn("account-1");
			await addMember("account-2", organization);
			await run("account-1", async () => organizationService.addAdmin(organization, "account-2"));

			await run("account-2", async () => service.leaveOrganization(organization));
			expect(roles["account-2"]).not.toContain(`org-admin:${organization}`);

			await run("account-1", async () => service.removeIdentity(nowSeconds()));
			expect(roles["account-1"]).not.toContain(`org-admin:${organization}`);
		});

		it("should not let the last org admin leave the organization", async () => {
			const organization = await createOwn("account-1");
			await addMember("account-2", organization);

			await expect(
				run("account-1", async () => service.leaveOrganization(organization))
			).rejects.toMatchObject({
				name: "ConflictError",
				message: "entityStorageAuthenticationAccountService.organizationLastAdmin"
			});
			expect(roles["account-1"]).toContain(`org-admin:${organization}`);

			await run("account-1", async () => organizationService.addAdmin(organization, "account-2"));
			await run("account-1", async () => service.leaveOrganization(organization));
			expect(roles["account-1"]).not.toContain(`org-admin:${organization}`);
		});

		it("should scope a user admin to the members and organizations it is an org admin of", async () => {
			const organization = await createOwn("account-1");
			const other = await createOwn("account-2");
			roles["account-1"].push("user-admin");

			await expect(
				run("account-1", async () => organizationService.query())
			).resolves.toMatchObject({ entities: [{ identity: organization }] });
			await expect(run("account-1", async () => admin.getManagedAccounts())).resolves.toEqual([
				"account-1"
			]);
			await expect(
				run("account-1", async () => organizationService.update(other, { profile: PROFILE }))
			).rejects.toMatchObject({ name: "ForbiddenError" });
			await expect(
				run("account-1", async () => organizationService.exportIdentity(other, nowSeconds()))
			).rejects.toMatchObject({ name: "ForbiddenError" });

			// The organization of the tenant gets no special treatment.
			await ContextIdStore.run(
				{
					[ContextIdKeys.Node]: NODE,
					[ContextIdKeys.Account]: "account-1",
					[ContextIdKeys.Organization]: other
				},
				async () => {
					await expect(admin.getManagedAccounts()).resolves.toEqual(["account-1"]);
					await expect(
						organizationService.update(other, { profile: PROFILE })
					).rejects.toMatchObject({ name: "ForbiddenError" });
				}
			);
		});
	});

	describe("removal by the org admin", () => {
		it("should let the sole member remove the organization, ending its membership", async () => {
			const organization = await createOwn("account-1");
			await withIdentity("account-3");
			await run("account-3", async () => service.joinOrganization(organization));
			const organizationItem = await AccountDataHelper.getDefault(
				accountData,
				"account-1",
				"organization"
			);
			const revocationIndex = await AccountDataHelper.getRevocationIndex(
				accountData,
				organizationItem?.id ?? ""
			);

			await run("account-1", async () => organizationService.remove(organization));

			expect((await organizations.query()).entities).toHaveLength(0);
			expect(identityComponent.revoked.has(`${organization}:${revocationIndex}`)).toBe(true);
			expect(identityComponent.held.has(organization)).toBe(false);
			expect(roles["account-1"]).toEqual([]);
			await expect(AdminScopeHelper.isMember(accountData, "account-1", organization)).resolves.toBe(
				false
			);
			await expect(run("account-1", async () => service.query("vc"))).resolves.toEqual({
				entities: [],
				cursor: undefined
			});
			// The pending requests to join it are removed, and only the revocation index it reached is
			// kept of its account data.
			expect((await requests.query()).entities).toHaveLength(0);
			expect(
				(await AccountDataHelper.query(accountData, organization)).entities.map(item => item.type)
			).toEqual(["organization-revocation-index"]);
		});

		it("should refuse removal while other members remain, saying they must be removed first", async () => {
			const organization = await createOwn("account-1");
			await addMember("account-2", organization);

			await expect(
				run("account-1", async () => organizationService.remove(organization))
			).rejects.toMatchObject({
				name: "ConflictError",
				message: "entityStorageOrganizationService.organizationHasOtherMembers"
			});
			await expect(
				run("account-2", async () => organizationService.remove(organization))
			).rejects.toMatchObject({ name: "ForbiddenError" });
			await expect(
				run("global-1", async () => organizationService.remove(organization))
			).rejects.toMatchObject({
				message: "entityStorageOrganizationService.organizationHasMembers"
			});
		});
	});

	describe("public data", () => {
		it("should publish the selected data of an organization by its DID and its id", async () => {
			const organization = await createOwn("account-1");
			const expected = [
				{
					"@context": "https://schema.org",
					"@type": "Organization",
					name: "Example Ltd",
					address: { "@type": "PostalAddress", addressLocality: "London" },
					identifier: organization
				},
				{ ...LOGO, identifier: organization }
			];

			// No sign in is needed by DID.
			await expect(
				ContextIdStore.run({}, async () => service.getPublicDataByIdentity(organization))
			).resolves.toEqual(expected);
			const registered = await organizationService.get(organization);
			await expect(
				run("account-2", async () => service.getPublicDataByAccount(registered.id))
			).resolves.toEqual(expected);
			await expect(
				ContextIdStore.run({}, async () => service.getPublicDataByAccount(registered.id))
			).rejects.toThrow();
		});

		it("should publish the data of an account, never an item only admins may see", async () => {
			const identity = await withIdentity("account-1");
			await run("account-1", async () =>
				service.create("profile", {
					"@context": "https://schema.org",
					"@type": "Person",
					name: "A"
				})
			);
			await run(undefined, async () =>
				admin.create("account-1", "supply-chain", { roles: ["buyer"] }, true, undefined, true)
			);
			await run("account-1", async () =>
				service.create("public-data", {
					"@context": "https://schema.org",
					"@type": "ItemList",
					itemListElement: ["profile", "supply-chain", "profile.missing.path"]
				})
			);

			await expect(
				ContextIdStore.run({}, async () => service.getPublicDataByIdentity(identity))
			).resolves.toEqual([
				{ "@context": "https://schema.org", "@type": "Person", name: "A", identifier: identity }
			]);
			await expect(
				run("account-2", async () => service.getPublicDataByAccount("account-1"))
			).resolves.toHaveLength(1);
			await expect(
				run("account-2", async () => service.getPublicDataByAccount("nobody"))
			).rejects.toMatchObject({ name: "NotFoundError" });
			await expect(
				ContextIdStore.run({}, async () => service.getPublicDataByIdentity("did:example:nobody"))
			).rejects.toMatchObject({
				name: "NotFoundError",
				message: "entityStorageAuthenticationAccountService.publicDataNotFound"
			});
		});

		it("should publish nothing when there is no public data", async () => {
			const identity = await withIdentity("account-1");
			await expect(
				ContextIdStore.run({}, async () => service.getPublicDataByIdentity(identity))
			).resolves.toEqual([]);
		});
	});

	describe("items only admins may see", () => {
		it("should keep the items only admins may see out of self-service, for a type outside the union", async () => {
			const supplyChainId = await run(undefined, async () =>
				admin.create(
					"account-1",
					"supply-chain",
					{ "@context": "https://schema.org", "@type": "Person", taxPin: "123" },
					true,
					undefined,
					true
				)
			);
			const noteId = await run("account-1", async () => service.create("myNote", { text: "a" }));

			await run("account-1", async () => {
				for (const attempt of [
					async () => service.get(supplyChainId),
					async () => service.update(supplyChainId, { taxPin: "x" }),
					async () => service.remove(supplyChainId)
				]) {
					await expect(attempt()).rejects.toMatchObject({ name: "NotFoundError" });
				}
				await expect(service.create("supplyChain", { taxPin: "x" })).rejects.toMatchObject({
					name: "ConflictError",
					message: "entityStorageAuthenticationAccountService.accountDataAdminOnly"
				});
				expect((await service.query()).entities.map(item => item.id)).toEqual([noteId]);
				expect((await service.query("supply-chain")).entities).toEqual([]);
				await expect(service.get(noteId)).resolves.toMatchObject({ type: "my-note" });

				const exported = await service.exportProfile();
				expect(exported.items.map(item => item.type)).toEqual(["my-note"]);
				// An import neither removes nor overwrites them.
				await expect(
					service.importProfile({
						type: "account-profile",
						version: 1,
						items: [{ type: "supply-chain", data: { taxPin: "x" } }]
					})
				).resolves.toEqual({ itemsImported: 0, itemsRemoved: 1, skippedTypes: ["supply-chain"] });
			});

			await expect(run(undefined, async () => admin.get(supplyChainId))).resolves.toMatchObject({
				type: "supply-chain",
				data: { taxPin: "123" },
				adminOnly: true
			});
			await expect(
				run(undefined, async () => admin.query("account-1", "supply-chain"))
			).resolves.toMatchObject({ entities: [{ adminOnly: true }] });
		});
	});
});
