// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import {
	AuthenticationAccountDataType,
	AuthenticationAccountHelper,
	type IOrganizationCreate
} from "@3sixty/api-auth-models";
import type { IAuthorizationComponent } from "@3sixty/authorization-models";
import { ContextIdKeys, ContextIdStore, type IContextIds } from "@3sixty/context";
import { ComponentFactory, DurationConstants, GeneralError, Is } from "@3sixty/core";
import { MemoryEntityStorageConnector } from "@3sixty/entity-storage-connector-memory";
import { EntityStorageConnectorFactory } from "@3sixty/entity-storage-models";
import type { IIdentityComponent } from "@3sixty/identity-models";
import { nameof } from "@3sixty/nameof";
import type { IProof } from "@3sixty/standards-w3c-did";
import { MimeTypes } from "@3sixty/web";
import type { AccountData } from "../../src/entities/accountData.js";
import type { Organization } from "../../src/entities/organization.js";
import type { OrganizationRequest } from "../../src/entities/organizationRequest.js";
import { initSchema } from "../../src/schema.js";
import { EntityStorageAuthenticationAccountAdminService } from "../../src/services/entityStorageAuthenticationAccountAdminService.js";
import { EntityStorageAuthenticationAccountService } from "../../src/services/entityStorageAuthenticationAccountService.js";
import { EntityStorageOrganizationRequestAdminService } from "../../src/services/entityStorageOrganizationRequestAdminService.js";
import { EntityStorageOrganizationService } from "../../src/services/entityStorageOrganizationService.js";
import { AccountDataHelper } from "../../src/utils/accountDataHelper.js";
import { AdminScopeHelper } from "../../src/utils/adminScopeHelper.js";
import { OrganizationHelper } from "../../src/utils/organizationHelper.js";
import { membershipCredential, organizationData } from "../helpers/accountDataValues.js";
import {
	createFakeIdentityComponent,
	type IFakeIdentityComponent
} from "../helpers/fakeIdentityComponent.js";
import {
	createRateComponent,
	createRoleAuthorizationComponent,
	createUserStorage,
	registerAccountDataVerifiers
} from "../helpers/testDependencies.js";

initSchema();

const ORGANIZATION = "did:example:organization";

/**
 * The membership credential the mock identity component issues.
 */
const MEMBERSHIP_CREDENTIAL = membershipCredential(ORGANIZATION, {
	id: "did:example:member",
	memberOf: { id: ORGANIZATION }
});
/**
 * The public properties of the profile, its name.
 */
const PUBLIC_PROFILE = {
	"@context": "https://schema.org",
	"@type": "Organization",
	name: "Example Ltd"
};
const PROFILE = { ...PUBLIC_PROFILE, email: "office@example.com" };
const PUBLIC_DATA = ["profile.name"];

/**
 * Create a proof made with an authentication method of a DID.
 * @param identity The DID.
 * @returns The proof.
 */
function proofFor(identity: string): IProof {
	return {
		type: "DataIntegrityProof",
		cryptosuite: "eddsa-jcs-2022",
		created: new Date().toISOString(),
		verificationMethod: `${identity}#key-1`,
		proofPurpose: "authentication",
		proofValue: "z123"
	};
}

/**
 * Add a first member account to the details of an organization, as an older client may send.
 * @param organization The details of the organization.
 * @param firstMemberAccountId The account named as the first member.
 * @returns The details.
 */
function withFirstMember(
	organization: IOrganizationCreate,
	firstMemberAccountId: string
): IOrganizationCreate {
	const request: IOrganizationCreate & { firstMemberAccountId?: string } = {
		...organization,
		firstMemberAccountId
	};
	return request;
}

describe("EntityStorageOrganizationService", () => {
	beforeAll(() => {
		registerAccountDataVerifiers();
	});

	let organizations: MemoryEntityStorageConnector<Organization>;
	let accountData: MemoryEntityStorageConnector<AccountData>;
	let requests: MemoryEntityStorageConnector<OrganizationRequest>;
	let identityComponent: IIdentityComponent;
	let roles: { [subject: string]: string[] };
	let authorization: IAuthorizationComponent;
	let service: EntityStorageOrganizationService;

	/**
	 * Run a function as a signed in account.
	 * @param accountId The account id.
	 * @param fn The function to run.
	 * @param organization The organization the account is signed in for.
	 * @returns The result of the function.
	 */
	async function asAccount<T>(
		accountId: string,
		fn: () => Promise<T>,
		organization?: string
	): Promise<T> {
		const contextIds: IContextIds = {
			[ContextIdKeys.Node]: "did:example:node",
			[ContextIdKeys.Account]: accountId,
			[ContextIdKeys.UserOrganization]: organization
		};
		return ContextIdStore.run(contextIds, fn);
	}

	beforeEach(() => {
		organizations = new MemoryEntityStorageConnector<Organization>({
			entitySchema: nameof<Organization>(),
			config: { storageKey: "organization-test" }
		});
		accountData = new MemoryEntityStorageConnector<AccountData>({
			entitySchema: nameof<AccountData>(),
			config: { storageKey: "account-data-organization-test" }
		});
		requests = new MemoryEntityStorageConnector<OrganizationRequest>({
			entitySchema: nameof<OrganizationRequest>(),
			config: { storageKey: "organization-request-organization-test" }
		});
		EntityStorageConnectorFactory.register("organization", () => organizations);
		EntityStorageConnectorFactory.register("account-data", () => accountData);
		EntityStorageConnectorFactory.register("organization-request", () => requests);
		EntityStorageConnectorFactory.register("authentication-user", () => createUserStorage());

		identityComponent = {
			className: () => "identity",
			identityCreate: vi.fn().mockResolvedValue({ id: ORGANIZATION }),
			identityRemove: vi.fn(),
			verificationMethodCreate: vi
				.fn()
				.mockResolvedValue({ id: `${ORGANIZATION}#trust-assertion` }),
			verifiableCredentialCreate: vi.fn().mockResolvedValue({
				verifiableCredential: MEMBERSHIP_CREDENTIAL,
				jwt: "membership.credential.jwt"
			}),
			proofVerify: vi.fn().mockResolvedValue(true)
		} as unknown as IIdentityComponent;
		roles = { "global-1": ["global-admin"] };
		authorization = createRoleAuthorizationComponent(roles);
		ComponentFactory.register("identity-service", () => identityComponent);
		ComponentFactory.register("authorization", () => authorization);
		ComponentFactory.register("authentication-rate", () => createRateComponent());

		service = new EntityStorageOrganizationService();
	});

	afterEach(async () => {
		ComponentFactory.unregister("identity-service");
		ComponentFactory.unregister("authorization");
		ComponentFactory.unregister("authentication-rate");
		EntityStorageConnectorFactory.unregister("organization");
		EntityStorageConnectorFactory.unregister("account-data");
		EntityStorageConnectorFactory.unregister("organization-request");
		EntityStorageConnectorFactory.unregister("authentication-user");
		await organizations.teardown();
		await accountData.teardown();
		await requests.teardown();
	});

	it("should create a node controlled DID with the trust verification method", async () => {
		const created = await asAccount("global-1", async () =>
			service.create({ profile: PROFILE, publicData: PUBLIC_DATA })
		);

		expect(identityComponent.identityCreate).toHaveBeenCalledWith(undefined, "did:example:node");
		expect(identityComponent.verificationMethodCreate).toHaveBeenCalledWith(
			ORGANIZATION,
			"assertionMethod",
			"trust-assertion",
			"did:example:node"
		);
		expect(created).toMatchObject({
			identity: ORGANIZATION,
			profile: PROFILE,
			publicData: PUBLIC_DATA,
			isAdmin: true
		});
		expect(await organizations.get(created.id)).toMatchObject({ identity: ORGANIZATION });

		const profile = await AccountDataHelper.getDefault(
			accountData,
			created.identity,
			AuthenticationAccountDataType.Profile
		);
		expect(profile?.data).toEqual(PROFILE);
		expect(roles["global-1"]).toContain(`org-admin:${ORGANIZATION}`);
	});

	it("should search the organizations by the start of their name for any account", async () => {
		await service.create({
			identity: "did:example:one",
			profile: PROFILE,
			publicData: PUBLIC_DATA
		});
		await service.create({
			identity: "did:example:two",
			profile: { ...PROFILE, name: "Exemplar Group" },
			publicData: PUBLIC_DATA
		});
		await service.create({
			identity: "did:example:three",
			profile: { ...PROFILE, name: "Other Co" }
		});

		const found = await asAccount("user-1", async () => service.search("EX"));
		const exact = await asAccount("user-1", async () => service.search(" exam "));

		expect(found.entities.map(item => item.identity).sort()).toEqual([
			"did:example:one",
			"did:example:two"
		]);
		expect(exact.entities).toEqual([
			{
				id: expect.any(String),
				identity: "did:example:one",
				public: [{ ...PUBLIC_PROFILE, identifier: "did:example:one" }],
				dateCreated: expect.any(String),
				dateModified: expect.any(String)
			}
		]);
		expect((await asAccount("user-1", async () => service.search("ltd"))).entities).toEqual([]);
		expect((await asAccount("user-1", async () => service.search(" "))).entities).toEqual([]);
		expect((await asAccount("user-1", async () => service.search("e", 1))).entities).toHaveLength(
			1
		);
	});

	it("should only change the profiles through the organization service", async () => {
		await service.create({ identity: ORGANIZATION, profile: PROFILE });
		const accountAdmin = new EntityStorageAuthenticationAccountAdminService();
		const profile = await AccountDataHelper.getDefault(
			accountData,
			ORGANIZATION,
			AuthenticationAccountDataType.Profile
		);

		for (const attempt of [
			async () =>
				accountAdmin.create(ORGANIZATION, AuthenticationAccountDataType.Profile, {
					name: "Renamed Ltd"
				}),
			async () => accountAdmin.update(profile?.id ?? "", { name: "Renamed Ltd" }),
			async () => accountAdmin.remove(profile?.id ?? "")
		]) {
			await expect(attempt()).rejects.toMatchObject({
				name: "UnprocessableError",
				message: "entityStorageAuthenticationAccountAdminService.organizationProfileManaged"
			});
		}
		expect((await service.search("example")).entities).toHaveLength(1);
	});

	it("should search by the name of the latest profile", async () => {
		const created = await service.create({
			identity: "did:example:one",
			profile: PROFILE
		});
		await asAccount("global-1", async () =>
			service.update(created.id, { profile: { ...PROFILE, name: "Renamed Ltd" } })
		);

		expect((await service.search("example")).entities).toEqual([]);
		expect((await service.search("ren")).entities.map(item => item.identity)).toEqual([
			"did:example:one"
		]);
		expect(await service.get(created.id)).not.toHaveProperty("searchName");
		expect((await service.query()).entities[0]).not.toHaveProperty("searchName");
	});

	it("should remove the created DID when the verification method cannot be added", async () => {
		vi.mocked(identityComponent.verificationMethodCreate).mockRejectedValue(new Error("failed"));

		await expect(asAccount("global-1", async () => service.create({}))).rejects.toThrow("failed");

		expect(identityComponent.identityRemove).toHaveBeenCalledWith(
			ORGANIZATION,
			{ removeKeys: true, removeDocumentKey: true },
			"did:example:node"
		);
		expect((await organizations.query()).entities).toHaveLength(0);
	});

	it("should register an existing DID once and add the caller as its first member", async () => {
		roles["account-1"] = ["user-admin"];
		await AccountDataHelper.createIdentity(accountData, "account-1", "did:example:user");
		await AccountDataHelper.create(
			accountData,
			"account-1",
			AuthenticationAccountDataType.Organization,
			organizationData("did:example:previous"),
			true
		);

		const created = await asAccount("account-1", async () =>
			service.create({
				identity: "did:example:existing",
				proof: proofFor("did:example:existing")
			})
		);

		expect(identityComponent.identityCreate).not.toHaveBeenCalled();
		expect(created.identity).toBe("did:example:existing");
		const membership = await AccountDataHelper.getDefault(
			accountData,
			"account-1",
			AuthenticationAccountDataType.Organization
		);
		// The existing default organization of the first member is kept.
		expect(membership).toMatchObject({
			data: organizationData("did:example:previous"),
			isDefault: true
		});
		const memberships = await AccountDataHelper.query(
			accountData,
			"account-1",
			AuthenticationAccountDataType.Organization
		);
		expect(
			memberships.entities.find(
				item => AuthenticationAccountHelper.getOrganization(item.data) === "did:example:existing"
			)
		).toMatchObject({
			isDefault: false
		});
		// The first member is made an org admin of the organization.
		expect(authorization.addRoleForSubject).toHaveBeenCalledWith(
			"system",
			"account-1",
			"org-admin:did:example:existing"
		);

		await expect(service.create({ identity: "did:example:existing" })).rejects.toMatchObject({
			name: "ConflictError",
			message: "entityStorageOrganizationService.organizationExists"
		});
	});

	it("should make the organization the default of a first member without one", async () => {
		roles["account-2"] = ["user-admin"];
		await asAccount("account-2", async () => service.create({ profile: PROFILE }));

		const membership = await AccountDataHelper.getDefault(
			accountData,
			"account-2",
			AuthenticationAccountDataType.Organization
		);
		expect(membership).toMatchObject({ data: organizationData(ORGANIZATION), isDefault: true });
	});

	it("should always make the caller the first member, ignoring an account in the request", async () => {
		roles["admin-1"] = ["user-admin"];
		roles["global-2"] = ["global-admin"];

		await asAccount("admin-1", async () => service.create(withFirstMember({}, "global-2")));

		await expect(AdminScopeHelper.isMember(accountData, "admin-1", ORGANIZATION)).resolves.toBe(
			true
		);
		await expect(AdminScopeHelper.isMember(accountData, "global-2", ORGANIZATION)).resolves.toBe(
			false
		);
		expect(roles["admin-1"]).toContain(`org-admin:${ORGANIZATION}`);
		expect(roles["global-2"]).not.toContain(`org-admin:${ORGANIZATION}`);
	});

	it("should create an organization without members for a system call", async () => {
		await service.create(withFirstMember({ identity: ORGANIZATION }, "account-1"));

		await expect(AdminScopeHelper.isMember(accountData, "account-1", ORGANIZATION)).resolves.toBe(
			false
		);
		expect(authorization.addRoleForSubject).not.toHaveBeenCalled();
	});

	it("should store the search name with the organization in a single write", async () => {
		const setSpy = vi.spyOn(organizations, "set");

		await service.create({ identity: ORGANIZATION, profile: PROFILE });

		expect(setSpy).toHaveBeenCalledTimes(1);
		expect(setSpy.mock.calls[0][0]).toMatchObject({ searchName: "example ltd" });
	});

	it("should return the name of every match when searching, with only the public data", async () => {
		for (const [identity, name] of [
			["did:example:one", "Example One"],
			["did:example:two", "Example Two"],
			["did:example:three", "Example Three"]
		]) {
			await service.create({ identity, profile: { ...PROFILE, name } });
		}
		await AccountDataHelper.create(
			accountData,
			"did:example:two",
			AuthenticationAccountDataType.Profile,
			{
				...PROFILE,
				name: "Example Two Later"
			}
		);
		const found = await asAccount("user-1", async () => service.search("example"));

		expect(
			Object.fromEntries(found.entities.map(item => [item.identity, item.public?.[0]?.name]))
		).toEqual({
			"did:example:one": "Example One",
			"did:example:two": "Example Two",
			"did:example:three": "Example Three"
		});
		// Only the name and the public properties are returned.
		expect(
			found.entities.every(
				item => Is.undefined(item.profile) && Is.undefined(item.public?.[0]?.email)
			)
		).toBe(true);
	});

	it("should find members through the indexed organization column with a single read", async () => {
		const created = await service.create({ identity: ORGANIZATION });
		for (let i = 0; i < 5; i++) {
			await AccountDataHelper.create(
				accountData,
				`other-${i}`,
				AuthenticationAccountDataType.Organization,
				organizationData("did:example:other")
			);
		}
		await AccountDataHelper.create(
			accountData,
			"member-1",
			AuthenticationAccountDataType.Organization,
			organizationData(ORGANIZATION)
		);
		const querySpy = vi.spyOn(accountData, "query");

		await expect(service.remove(created.id)).rejects.toMatchObject({
			message: "entityStorageOrganizationService.organizationHasMembers"
		});
		expect(querySpy).toHaveBeenCalledTimes(1);
		expect(querySpy.mock.calls[0][4]).toBe(2);
	});

	it("should only let admins create, query and remove", async () => {
		await expect(asAccount("account-1", async () => service.create({}))).rejects.toMatchObject({
			name: "ForbiddenError",
			message: "entityStorageOrganizationService.organizationAdminRequired"
		});
		await expect(asAccount("account-1", async () => service.query())).rejects.toMatchObject({
			name: "ForbiddenError"
		});

		const created = await service.create({ identity: ORGANIZATION });
		await expect(
			asAccount("account-1", async () => service.remove(created.id), ORGANIZATION)
		).rejects.toMatchObject({ name: "ForbiddenError" });

		const page = await asAccount("global-1", async () => service.query());
		expect(page.entities.map(o => o.identity)).toEqual([ORGANIZATION]);
	});

	it("should let user admins manage the organizations they are an org admin of", async () => {
		roles["admin-1"] = ["user-admin"];
		await service.create({ identity: "did:example:unrelated" });

		const created = await asAccount(
			"admin-1",
			async () => service.create({ profile: PROFILE }),
			"did:example:other"
		);
		const page = await asAccount("admin-1", async () => service.query());
		expect(page.entities.map(o => o.identity)).toEqual([ORGANIZATION]);
		// The creator is the first member, so leaves before the organization can be removed.
		const membership = await AccountDataHelper.getDefault(
			accountData,
			"admin-1",
			AuthenticationAccountDataType.Organization
		);
		await AccountDataHelper.remove(accountData, membership?.id ?? "");
		await asAccount("admin-1", async () => service.remove(created.id), "did:example:other");
		expect(await organizations.get(created.id)).toBeUndefined();
	});

	it("should require a proof by an existing DID unless the call is a system call", async () => {
		await asAccount("global-1", async () => {
			await expect(service.create({ identity: "did:example:partner" })).rejects.toMatchObject({
				name: "UnauthorizedError",
				message: "identityProofHelper.identityProofInvalid"
			});
			const proof = proofFor("did:example:partner");
			await expect(
				service.create({ identity: "did:example:partner", proof })
			).resolves.toMatchObject({ identity: "did:example:partner" });
			expect(identityComponent.proofVerify).toHaveBeenCalledWith(
				AuthenticationAccountHelper.organizationProofDocument(
					"did:example:partner",
					"did:example:node"
				),
				proof
			);
		});

		// A system call, such as from the node CLI, has no caller account and needs no proof.
		vi.mocked(identityComponent.proofVerify).mockClear();
		await expect(service.create({ identity: "did:example:system" })).resolves.toMatchObject({
			identity: "did:example:system"
		});
		expect(identityComponent.proofVerify).not.toHaveBeenCalled();
	});

	it("should refuse to register a DID held by an account", async () => {
		await AccountDataHelper.createIdentity(accountData, "account-1", "did:example:user");

		await expect(service.create({ identity: "did:example:user" })).rejects.toMatchObject({
			name: "ConflictError",
			message: "entityStorageOrganizationService.organizationIdentityInUse"
		});
	});

	it("should show the whole profile only to members and admins", async () => {
		const created = await service.create({
			identity: ORGANIZATION,
			profile: PROFILE,
			publicData: PUBLIC_DATA
		});
		await AccountDataHelper.create(
			accountData,
			"member-1",
			AuthenticationAccountDataType.Organization,
			organizationData(ORGANIZATION),
			true
		);

		const asOutsider = await asAccount("outsider-1", async () => service.get(ORGANIZATION));
		expect(asOutsider.public).toEqual([{ ...PUBLIC_PROFILE, identifier: ORGANIZATION }]);
		expect(asOutsider.profile).toBeUndefined();
		expect(asOutsider.publicData).toBeUndefined();
		expect(asOutsider.isAdmin).toBe(false);

		const asMember = await asAccount("member-1", async () => service.get(created.id));
		expect(asMember).toMatchObject({ profile: PROFILE, publicData: PUBLIC_DATA, isAdmin: false });

		const asGlobal = await asAccount("global-1", async () => service.get(created.id));
		expect(asGlobal.profile).toEqual(PROFILE);

		roles["admin-1"] = ["user-admin"];
		const asAdmin = await asAccount("admin-1", async () => service.get(created.id));
		expect(asAdmin.profile).toEqual(PROFILE);

		roles["org-admin-1"] = [`org-admin:${ORGANIZATION}`];
		const asOrgAdmin = await asAccount("org-admin-1", async () => service.get(created.id));
		expect(asOrgAdmin).toMatchObject({ profile: PROFILE, isAdmin: true });

		await expect(service.get("did:example:missing")).rejects.toMatchObject({
			name: "NotFoundError"
		});
	});

	it("should let org admins and global admins update the profile, logo and public data", async () => {
		const created = await service.create({ identity: ORGANIZATION, profile: PROFILE });
		roles["org-admin-1"] = [`org-admin:${ORGANIZATION}`];
		const updated = { ...PROFILE, name: "Renamed Ltd" };
		const logo = {
			"@context": "https://schema.org",
			"@type": "ImageObject",
			encodingFormat: MimeTypes.Svg,
			contentUrl: `data:${MimeTypes.Svg};base64,PHN2Zy8+`
		};

		await asAccount("org-admin-1", async () =>
			service.update(created.id, { profile: updated, logo, publicData: ["profile.name", "logo"] })
		);

		const organization = await service.get(created.id);
		expect(organization).toMatchObject({
			profile: updated,
			logo,
			publicData: ["profile.name", "logo"]
		});
		const profiles = await AccountDataHelper.query(
			accountData,
			created.identity,
			AuthenticationAccountDataType.Profile
		);
		expect(profiles.entities).toHaveLength(1);
		const asOutsider = await asAccount("outsider-1", async () => service.get(created.id));
		expect(asOutsider.public).toEqual([
			{ ...PUBLIC_PROFILE, name: "Renamed Ltd", identifier: ORGANIZATION },
			{ ...logo, identifier: ORGANIZATION }
		]);

		// A null logo removes it, the omitted fields are unchanged.
		await asAccount("global-1", async () => service.update(created.id, { logo: null }));
		const withoutLogo = await service.get(created.id);
		expect(withoutLogo.logo).toBeUndefined();
		expect(withoutLogo.profile).toEqual(updated);

		// A user admin that is not an org admin of the organization, and a member, may not.
		roles["admin-2"] = ["user-admin"];
		for (const accountId of ["admin-2", "member-1"]) {
			await expect(
				asAccount(
					accountId,
					async () => service.update(created.id, { profile: updated }),
					ORGANIZATION
				)
			).rejects.toMatchObject({ name: "ForbiddenError" });
		}
	});

	it("should refuse a logo or public data that is not valid", async () => {
		const created = await service.create({ identity: ORGANIZATION, profile: PROFILE });
		const logo = {
			"@context": "https://schema.org",
			"@type": "ImageObject",
			encodingFormat: MimeTypes.Gif,
			contentUrl: `data:${MimeTypes.Gif};base64,R0lGOD==`
		};
		const tooLarge = {
			...logo,
			encodingFormat: MimeTypes.Png,
			contentUrl: `data:${MimeTypes.Png};base64,${"A".repeat(350000)}`
		};

		await expect(
			asAccount("global-1", async () => service.update(created.id, { logo }))
		).rejects.toMatchObject({
			name: "UnprocessableError",
			message: "accountDataHelper.logoInvalid"
		});
		await expect(
			asAccount("global-1", async () => service.update(created.id, { logo: tooLarge }))
		).rejects.toMatchObject({
			name: "UnprocessableError",
			message: "accountDataHelper.logoTooLarge"
		});
		for (const publicData of [["Profile.name"], ["profile..name"], ["profile.__proto__"], [1]]) {
			await expect(
				asAccount("global-1", async () =>
					service.update(created.id, { publicData: publicData as string[] })
				)
			).rejects.toMatchObject({
				name: "UnprocessableError",
				message: "publicDataHelper.publicDataInvalid"
			});
		}
		await expect(service.create({ logo })).rejects.toMatchObject({
			message: "accountDataHelper.logoInvalid"
		});
	});

	it("should remove an organization without members and refuse one with members", async () => {
		const created = await service.create({ identity: ORGANIZATION, profile: PROFILE });
		await AccountDataHelper.create(
			accountData,
			"member-1",
			AuthenticationAccountDataType.Organization,
			organizationData(ORGANIZATION),
			true
		);

		await expect(service.remove(created.id)).rejects.toMatchObject({
			name: "ConflictError",
			message: "entityStorageOrganizationService.organizationHasMembers"
		});

		const membership = await AccountDataHelper.getDefault(
			accountData,
			"member-1",
			AuthenticationAccountDataType.Organization
		);
		await AccountDataHelper.remove(accountData, membership?.id ?? "");
		await service.remove(ORGANIZATION);

		expect(await organizations.get(created.id)).toBeUndefined();
		expect((await AccountDataHelper.query(accountData, created.identity)).entities).toHaveLength(0);
	});

	it("should reject the pending requests to join an organization that is removed", async () => {
		const created = await service.create({ identity: ORGANIZATION, profile: PROFILE });
		const now = new Date().toISOString();
		const request = (id: string, organization: string, status: string): OrganizationRequest => ({
			id,
			accountId: `account-${id}`,
			organization,
			status: status as OrganizationRequest["status"],
			dateCreated: now,
			dateModified: now
		});
		await requests.set(request("1", ORGANIZATION, "pending"));
		await requests.set(request("2", ORGANIZATION, "pending"));
		await requests.set(request("3", ORGANIZATION, "accepted"));
		await requests.set(request("4", "did:example:other", "pending"));

		await service.remove(created.id);

		const byId = Object.fromEntries((await requests.query()).entities.map(item => [item.id, item]));
		for (const id of ["1", "2"]) {
			expect(byId[id]).toMatchObject({
				status: "rejected",
				reason: "organizationRequest.reason.organizationRemoved"
			});
		}
		// Answered requests and those for other organizations are left.
		expect(byId["3"]).toMatchObject({ status: "accepted" });
		expect(byId["3"].reason).toBeUndefined();
		expect(byId["4"]).toMatchObject({ status: "pending" });
	});

	describe("joining", () => {
		beforeEach(async () => {
			await AccountDataHelper.createIdentity(accountData, "account-1", "did:example:user");
		});

		it("should only let accounts ask to join a registered organization", async () => {
			const accountService = new EntityStorageAuthenticationAccountService();

			await expect(
				asAccount("account-1", async () => accountService.joinOrganization(ORGANIZATION))
			).rejects.toMatchObject({
				name: "NotFoundError",
				message: "organizationHelper.organizationNotRegistered"
			});

			await OrganizationHelper.register(organizations, ORGANIZATION);
			await asAccount("account-1", async () => accountService.joinOrganization(ORGANIZATION));
			expect((await requests.query()).entities).toHaveLength(1);
		});

		it("should accept the organization of the tenant without it being registered", async () => {
			const accountService = new EntityStorageAuthenticationAccountService();

			await ContextIdStore.run(
				{ [ContextIdKeys.Account]: "account-1", [ContextIdKeys.Organization]: ORGANIZATION },
				async () => accountService.joinOrganization(ORGANIZATION)
			);

			expect((await requests.query()).entities).toHaveLength(1);
		});

		it("should only accept a request for a registered organization", async () => {
			const now = new Date().toISOString();
			await requests.set({
				id: "request-1",
				accountId: "account-1",
				organization: ORGANIZATION,
				status: "pending",
				dateCreated: now,
				dateModified: now
			});
			const requestAdmin = new EntityStorageOrganizationRequestAdminService();

			await expect(requestAdmin.accept("request-1")).rejects.toMatchObject({
				name: "NotFoundError",
				message: "organizationHelper.organizationNotRegistered"
			});
		});

		it("should only let an admin add an account to a registered organization", async () => {
			const accountAdmin = new EntityStorageAuthenticationAccountAdminService();

			await expect(
				accountAdmin.create(
					"account-1",
					AuthenticationAccountDataType.Organization,
					organizationData(ORGANIZATION)
				)
			).rejects.toMatchObject({
				name: "NotFoundError",
				message: "organizationHelper.organizationNotRegistered"
			});

			await OrganizationHelper.register(organizations, ORGANIZATION);
			await expect(
				accountAdmin.create(
					"account-1",
					AuthenticationAccountDataType.Organization,
					organizationData(ORGANIZATION)
				)
			).resolves.toEqual(expect.any(String));
		});
	});

	it("should keep the existing organization when registering a DID again", async () => {
		const first = await OrganizationHelper.register(organizations, ORGANIZATION);
		const second = await OrganizationHelper.register(organizations, ORGANIZATION);

		expect(first.created).toBe(true);
		expect(second.created).toBe(false);
		expect(second.organization.id).toBe(first.organization.id);
	});
});

describe("EntityStorageOrganizationService identity export and import", () => {
	const NODE = "did:example:node";
	let organizations: MemoryEntityStorageConnector<Organization>;
	let accountData: MemoryEntityStorageConnector<AccountData>;
	let identityComponent: IFakeIdentityComponent;
	let roles: { [subject: string]: string[] };
	let rate: { className: () => string; check: ReturnType<typeof vi.fn> };
	let service: EntityStorageOrganizationService;

	/**
	 * Run a function with a context, as the system when no account is given.
	 * @param accountId The account id.
	 * @param fn The function to run.
	 * @returns The result of the function.
	 */
	async function run<T>(accountId: string | undefined, fn: () => Promise<T>): Promise<T> {
		return ContextIdStore.run(
			{ [ContextIdKeys.Node]: NODE, [ContextIdKeys.Account]: accountId },
			fn
		);
	}

	/**
	 * Get the current time in seconds.
	 * @returns The time.
	 */
	function nowSeconds(): number {
		return Math.floor(Date.now() / DurationConstants.MsPerSecond);
	}

	beforeEach(() => {
		organizations = new MemoryEntityStorageConnector<Organization>({
			entitySchema: nameof<Organization>(),
			config: { storageKey: "organization-export-test" }
		});
		accountData = new MemoryEntityStorageConnector<AccountData>({
			entitySchema: nameof<AccountData>(),
			config: { storageKey: "account-data-organization-export-test" }
		});
		EntityStorageConnectorFactory.register("organization", () => organizations);
		EntityStorageConnectorFactory.register("account-data", () => accountData);
		EntityStorageConnectorFactory.register(
			"organization-request",
			() =>
				new MemoryEntityStorageConnector<OrganizationRequest>({
					entitySchema: nameof<OrganizationRequest>(),
					config: { storageKey: "organization-request-export-test" }
				})
		);
		identityComponent = createFakeIdentityComponent();
		roles = { "global-1": ["global-admin"], "admin-1": ["user-admin"] };
		// The user admin is an org admin of every organization in these tests.
		const authorization = createRoleAuthorizationComponent(roles, ["admin-1"]);
		rate = { className: () => "rate", check: vi.fn() };
		ComponentFactory.register("identity-service", () => identityComponent);
		ComponentFactory.register("authorization", () => authorization);
		ComponentFactory.register("authentication-rate", () => rate);
		service = new EntityStorageOrganizationService();
	});

	afterEach(async () => {
		ComponentFactory.unregister("identity-service");
		ComponentFactory.unregister("authorization");
		ComponentFactory.unregister("authentication-rate");
		EntityStorageConnectorFactory.unregister("organization");
		EntityStorageConnectorFactory.unregister("account-data");
		EntityStorageConnectorFactory.unregister("organization-request");
		await organizations.teardown();
		await accountData.teardown();
	});

	it("should export the identity of an organization the node created to an admin", async () => {
		const created = await run(undefined, async () => service.create({ profile: PROFILE }));

		const exported = await run("admin-1", async () =>
			service.exportIdentity(created.id, nowSeconds())
		);
		expect(exported.identity.document.id).toBe(created.identity);
		expect(exported.nextRevocationIndex).toBe(0);
		expect(identityComponent.identityExport).toHaveBeenCalledWith(created.identity, NODE);
		expect(rate.check).toHaveBeenCalledWith("export-organization-identity", "admin-1");

		// A system call, such as from the node CLI, has no session.
		await expect(
			run(undefined, async () => service.exportIdentity(created.identity))
		).resolves.toBeDefined();
	});

	it("should refuse an export to a caller who is not an admin or did not sign in recently", async () => {
		const created = await run(undefined, async () => service.create({}));

		await expect(
			run("account-1", async () => service.exportIdentity(created.id, nowSeconds()))
		).rejects.toMatchObject({
			name: "ForbiddenError",
			message: "entityStorageOrganizationService.organizationAdminRequired"
		});
		for (const sessionStart of [undefined, nowSeconds() - 301]) {
			await expect(
				run("admin-1", async () => service.exportIdentity(created.id, sessionStart))
			).rejects.toMatchObject({
				name: "UnauthorizedError",
				message: "recentSignInHelper.recentSignInRequired"
			});
		}
		await expect(
			run("admin-1", async () => service.exportIdentity("did:example:missing", nowSeconds()))
		).rejects.toMatchObject({ name: "NotFoundError" });
		expect(identityComponent.identityExport).not.toHaveBeenCalled();
	});

	it("should refuse to export an organization whose keys the node does not hold", async () => {
		const registered = await run(undefined, async () =>
			service.create({ identity: "did:example:existing" })
		);
		await expect(
			run("admin-1", async () => service.exportIdentity(registered.id, nowSeconds()))
		).rejects.toMatchObject({
			name: "UnprocessableError",
			message: "entityStorageOrganizationService.identityKeysNotHeld",
			properties: { identity: "did:example:existing" }
		});
	});

	it("should create an organization from an export, with the caller as its first member", async () => {
		const created = await run(undefined, async () => service.create({}));
		const file = await run(undefined, async () => service.exportIdentity(created.id));
		const exported = file.identity;
		await run(undefined, async () => service.remove(created.id));
		identityComponent.held.delete(created.identity);
		await AccountDataHelper.createIdentity(accountData, "admin-1", "did:example:admin");

		const imported = await run("admin-1", async () =>
			service.create({ identityImport: file, profile: PROFILE, publicData: PUBLIC_DATA })
		);

		expect(imported.identity).toBe(created.identity);
		expect(identityComponent.identityImport).toHaveBeenCalledWith(exported, NODE);
		expect(identityComponent.held.has(created.identity)).toBe(true);
		expect(rate.check).toHaveBeenCalledWith("import-organization-identity", "admin-1");
		await expect(AdminScopeHelper.isMember(accountData, "admin-1", created.identity)).resolves.toBe(
			true
		);
		await expect(run(undefined, async () => service.get(imported.id))).resolves.toMatchObject({
			profile: PROFILE
		});
	});

	it("should carry the revocation index of an organization through its export and import", async () => {
		const created = await run(undefined, async () => service.create({}));
		for (let i = 0; i < 3; i++) {
			await OrganizationHelper.allocateRevocationIndex(organizations, created.identity);
		}
		const exported = await run(undefined, async () => service.exportIdentity(created.id));
		expect(exported.nextRevocationIndex).toBe(3);
		await run(undefined, async () => service.remove(created.id));
		identityComponent.held.delete(created.identity);
		// The node never kept a removed index, as on another node.
		await accountData.remove(OrganizationHelper.retiredRevocationIndexId(created.identity));

		await run(undefined, async () => service.create({ identityImport: exported }));

		await expect(
			OrganizationHelper.allocateRevocationIndex(organizations, created.identity)
		).resolves.toBe(3);
	});

	it("should never go below the revocation index the DID reached on this node", async () => {
		const created = await run(undefined, async () => service.create({}));
		await OrganizationHelper.allocateRevocationIndex(organizations, created.identity);
		// An export taken before more credentials were issued.
		const stale = await run(undefined, async () => service.exportIdentity(created.id));
		for (let i = 0; i < 4; i++) {
			await OrganizationHelper.allocateRevocationIndex(organizations, created.identity);
		}
		await run(undefined, async () => service.remove(created.id));
		identityComponent.held.delete(created.identity);
		await expect(
			OrganizationHelper.getRetiredRevocationIndex(accountData, created.identity)
		).resolves.toBe(5);

		await run(undefined, async () => service.create({ identityImport: stale }));

		await expect(
			OrganizationHelper.allocateRevocationIndex(organizations, created.identity)
		).resolves.toBe(5);
	});

	it("should carry on the revocation index of an existing DID registered again", async () => {
		const first = await run(undefined, async () =>
			service.create({ identity: "did:example:existing", profile: PROFILE })
		);
		await OrganizationHelper.allocateRevocationIndex(organizations, first.identity);
		await OrganizationHelper.allocateRevocationIndex(organizations, first.identity);
		await run(undefined, async () => service.remove(first.id));
		await expect(run(undefined, async () => service.get(first.identity))).rejects.toMatchObject({
			name: "NotFoundError"
		});

		await run(undefined, async () => service.create({ identity: "did:example:existing" }));

		await expect(
			OrganizationHelper.allocateRevocationIndex(organizations, first.identity)
		).resolves.toBe(2);
	});

	it("should refuse an export whose revocation index is not a whole number", async () => {
		const created = await run(undefined, async () => service.create({}));
		const file = await run(undefined, async () => service.exportIdentity(created.id));

		for (const nextRevocationIndex of [-1, 1.5, "2"]) {
			await expect(
				run("global-1", async () =>
					service.create({ identityImport: { ...file, nextRevocationIndex } as never })
				)
			).rejects.toMatchObject({
				name: "UnprocessableError",
				message: "entityStorageOrganizationService.nextRevocationIndexInvalid"
			});
		}
	});

	it("should refuse another kind of file, or another version, before anything else", async () => {
		const created = await run(undefined, async () => service.create({}));
		const file = await run(undefined, async () => service.exportIdentity(created.id));

		for (const [identityImport, message, properties] of [
			[
				{ ...file, type: "account-identity" },
				"exportFileHelper.fileTypeMismatch",
				{ expected: "organization-identity", actual: "account-identity" }
			],
			[file.identity, "exportFileHelper.fileTypeMismatch", { expected: "organization-identity" }],
			[
				{ ...file, version: 2 },
				"exportFileHelper.fileVersionUnsupported",
				{ version: 2, supported: 1 }
			]
		] as const) {
			// Refused even to a caller who may not create organizations, as nothing else is checked.
			await expect(
				run("account-1", async () => service.create({ identityImport: identityImport as never }))
			).rejects.toMatchObject({ name: "UnprocessableError", message, properties });
		}
		expect(identityComponent.identityImport).not.toHaveBeenCalled();
	});

	it("should refuse an export given with an identity or proof, or for a DID held", async () => {
		const created = await run(undefined, async () => service.create({}));
		const file = await run(undefined, async () => service.exportIdentity(created.id));
		const exported = file.identity;

		await expect(
			run("global-1", async () =>
				service.create({ identityImport: file, identity: created.identity })
			)
		).rejects.toMatchObject({
			name: "UnprocessableError",
			message: "entityStorageOrganizationService.identityImportExclusive"
		});
		await expect(
			run("global-1", async () => service.create({ identityImport: file }))
		).rejects.toMatchObject({
			name: "ConflictError",
			message: "entityStorageOrganizationService.organizationExists"
		});
		await AccountDataHelper.createIdentity(accountData, "account-1", "did:example:user");
		await expect(
			run("global-1", async () =>
				service.create({
					identityImport: {
						...file,
						identity: { ...exported, document: { ...exported.document, id: "did:example:user" } }
					}
				})
			)
		).rejects.toMatchObject({
			name: "ConflictError",
			message: "entityStorageOrganizationService.organizationIdentityInUse"
		});
		await expect(
			run("global-1", async () =>
				service.create({ identityImport: { ...file, identity: {} } as never })
			)
		).rejects.toMatchObject({
			message: "entityStorageOrganizationService.identityExportInvalid"
		});
		await expect(
			run("account-1", async () => service.create({ identityImport: file }))
		).rejects.toMatchObject({ name: "ForbiddenError" });
		expect(identityComponent.identityImport).not.toHaveBeenCalled();
	});

	it("should remove the imported identity again when registering fails", async () => {
		const created = await run(undefined, async () => service.create({}));
		const file = await run(undefined, async () => service.exportIdentity(created.id));
		await run(undefined, async () => service.remove(created.id));
		identityComponent.held.delete(created.identity);
		vi.spyOn(organizations, "set").mockRejectedValueOnce(new Error("storage failed"));

		await expect(
			run("global-1", async () => service.create({ identityImport: file }))
		).rejects.toThrow("storage failed");

		expect(identityComponent.held.has(created.identity)).toBe(false);
		expect(identityComponent.identityRemove).toHaveBeenLastCalledWith(
			created.identity,
			{ removeKeys: true, removeDocumentKey: true, retainDocument: true },
			NODE
		);
	});

	it("should never export the DID of the node or of the organization of the tenant", async () => {
		const TENANT = "did:example:tenant";
		await OrganizationHelper.register(organizations, NODE);
		await OrganizationHelper.register(organizations, TENANT);

		for (const identity of [NODE, TENANT]) {
			for (const accountId of ["global-1", "admin-1", undefined]) {
				await expect(
					ContextIdStore.run(
						{
							[ContextIdKeys.Node]: NODE,
							[ContextIdKeys.Organization]: TENANT,
							[ContextIdKeys.Account]: accountId
						},
						async () => service.exportIdentity(identity, nowSeconds())
					)
				).rejects.toMatchObject({
					name: "ForbiddenError",
					message: "entityStorageOrganizationService.nodeIdentityExportNotPermitted",
					properties: { identity }
				});
			}
		}
		expect(identityComponent.identityExport).not.toHaveBeenCalled();

		// Nor can either be imported as an organization.
		const created = await run(undefined, async () => service.create({}));
		const file = await run(undefined, async () => service.exportIdentity(created.id));
		const exported = file.identity;
		for (const identity of [NODE, TENANT]) {
			await expect(
				ContextIdStore.run(
					{ [ContextIdKeys.Node]: NODE, [ContextIdKeys.Organization]: TENANT },
					async () =>
						service.create({
							identityImport: {
								...file,
								identity: { ...exported, document: { ...exported.document, id: identity } }
							}
						})
				)
			).rejects.toMatchObject({ name: "ConflictError" });
		}
		expect(identityComponent.identityImport).not.toHaveBeenCalled();
	});

	it("should report a DID the node already holds as a conflict when importing", async () => {
		const created = await run(undefined, async () => service.create({}));
		const file = await run(undefined, async () => service.exportIdentity(created.id));
		const exported = file.identity;
		await run(undefined, async () => service.remove(created.id));
		identityComponent.held.set(created.identity, exported);

		await expect(
			run("global-1", async () => service.create({ identityImport: file }))
		).rejects.toMatchObject({
			name: "ConflictError",
			message: "entityStorageOrganizationService.identityImportConflict",
			properties: { conflictId: created.identity }
		});
	});

	it("should refuse an export whose keys do not match as unprocessable", async () => {
		const created = await run(undefined, async () => service.create({}));
		const file = await run(undefined, async () => service.exportIdentity(created.id));
		await run(undefined, async () => service.remove(created.id));
		vi.mocked(identityComponent.identityImport).mockRejectedValueOnce(
			new GeneralError(
				"identityService",
				"identityImportFailed",
				undefined,
				new GeneralError("entityStorageIdentityConnector", "keyMismatch")
			)
		);

		await expect(
			run("global-1", async () => service.create({ identityImport: file }))
		).rejects.toMatchObject({
			name: "UnprocessableError",
			message: "entityStorageOrganizationService.identityExportInvalid",
			cause: { message: "identityService.identityImportFailed" }
		});
		await expect(organizations.query()).resolves.toMatchObject({ entities: [] });
	});

	it("should remove the keys of a DID the node created with the organization, not of an existing one", async () => {
		const created = await run(undefined, async () => service.create({}));
		const existing = await run(undefined, async () =>
			service.create({ identity: "did:example:existing" })
		);

		await run(undefined, async () => service.remove(created.id));
		expect(identityComponent.held.has(created.identity)).toBe(false);
		expect(identityComponent.identityRemove).toHaveBeenCalledWith(
			created.identity,
			{ removeKeys: true, removeDocumentKey: true, retainDocument: true },
			NODE
		);

		await run(undefined, async () => service.remove(existing.id));
		expect(identityComponent.identityRemove).toHaveBeenCalledTimes(1);
	});

	it("should keep the organization when removing its keys fails", async () => {
		const created = await run(undefined, async () => service.create({}));
		vi.mocked(identityComponent.identityRemove).mockRejectedValueOnce(new Error("vault down"));

		await expect(run(undefined, async () => service.remove(created.id))).rejects.toMatchObject({
			name: "GeneralError",
			message: "entityStorageOrganizationService.organizationIdentityRemoveFailed",
			properties: { identity: created.identity }
		});
		await expect(run(undefined, async () => service.get(created.id))).resolves.toMatchObject({
			identity: created.identity
		});
	});

	it("should remove a created DID and the organization when storing the profiles fails", async () => {
		vi.spyOn(accountData, "set").mockRejectedValueOnce(new Error("storage failed"));

		await expect(run(undefined, async () => service.create({ profile: PROFILE }))).rejects.toThrow(
			"storage failed"
		);

		expect(identityComponent.held.size).toBe(0);
		expect(identityComponent.identityRemove).toHaveBeenCalledWith(
			expect.any(String),
			{ removeKeys: true, removeDocumentKey: true, retainDocument: false },
			NODE
		);
		await expect(run("global-1", async () => service.query())).resolves.toMatchObject({
			entities: []
		});
	});

	it("should undo the organization when adding the first member fails", async () => {
		await AccountDataHelper.createIdentity(accountData, "admin-1", "did:example:admin");
		vi.mocked(identityComponent.verifiableCredentialCreate).mockRejectedValueOnce(
			new Error("signing failed")
		);
		// A failing step of the rollback does not stop the others or hide the error.
		const logging = { className: () => "logging", log: vi.fn() };
		ComponentFactory.register("logging", () => logging);
		service = new EntityStorageOrganizationService();
		vi.spyOn(accountData, "remove").mockRejectedValueOnce(new Error("remove failed"));

		await expect(run("admin-1", async () => service.create({ profile: PROFILE }))).rejects.toThrow(
			"signing failed"
		);
		ComponentFactory.unregister("logging");

		expect(identityComponent.held.size).toBe(0);
		await expect(run("global-1", async () => service.query())).resolves.toMatchObject({
			entities: []
		});
		await expect(
			AdminScopeHelper.isMember(accountData, "admin-1", "did:entity-storage:0x0001")
		).resolves.toBe(false);
		expect(logging.log).toHaveBeenCalledWith(
			expect.objectContaining({ message: "organizationCreateRollbackFailed" })
		);
	});
});
