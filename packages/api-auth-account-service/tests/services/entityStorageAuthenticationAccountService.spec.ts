// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { AccountDataValidationFactory, AuthenticationAccountHelper } from "@3sixty/api-auth-models";
import type { IAuthorizationComponent } from "@3sixty/authorization-models";
import { ContextIdKeys, ContextIdStore } from "@3sixty/context";
import {
	ComponentFactory,
	ConflictError,
	DurationConstants,
	GeneralError,
	Is,
	NotFoundError,
	UnauthorizedError,
	UnprocessableError
} from "@3sixty/core";
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
import { AccountDataHelper } from "../../src/utils/accountDataHelper.js";
import { OrganizationMembershipHelper } from "../../src/utils/organizationMembershipHelper.js";
import {
	credentialData,
	identityData,
	membershipCredential,
	organizationData,
	verifyTestCredential
} from "../helpers/accountDataValues.js";
import {
	createAuthorizationComponent,
	createOrganizationStorage,
	createRateComponent,
	createUserStorage,
	mockRequiredComponents,
	registerAccountDataVerifiers
} from "../helpers/testDependencies.js";

initSchema();

const FIVE_MINUTES_MS = 5 * DurationConstants.MsPerMinute;
const SIX_MINUTES_MS = 360000;

/**
 * Get the current time in seconds, a session that started now is recent.
 * @returns The time.
 */
function nowSeconds(): number {
	return Math.floor(Date.now() / DurationConstants.MsPerSecond);
}

/**
 * Run a function as a signed in account.
 * @param accountId The account id.
 * @param fn The function to run.
 * @param identity The identity of the caller, if any.
 * @param organization The organization of the caller, if any.
 * @returns The result of the function.
 */
async function asAccount<T>(
	accountId: string,
	fn: () => Promise<T>,
	identity?: string,
	organization?: string
): Promise<T> {
	return ContextIdStore.run(
		{
			[ContextIdKeys.Account]: accountId,
			[ContextIdKeys.User]: identity,
			[ContextIdKeys.UserOrganization]: organization
		},
		fn
	);
}

/**
 * Create a proof made with a verification method of a DID.
 * @param identity The DID.
 * @param created When the proof was created, now when omitted.
 * @returns The proof.
 */
function proofFor(identity: string, created?: string): IProof {
	return {
		type: "DataIntegrityProof",
		cryptosuite: "eddsa-jcs-2022",
		created: created ?? new Date().toISOString(),
		verificationMethod: `${identity}#key-1`,
		proofPurpose: "authentication",
		proofValue: "z123"
	};
}

/**
 * Create a mock identity component.
 * @returns The component.
 */
function createIdentityComponent(): IIdentityComponent {
	return {
		identityCreate: vi.fn().mockResolvedValue({ id: "did:example:created" }),
		identityRemove: vi.fn().mockResolvedValue(undefined),
		proofVerify: vi.fn().mockResolvedValue(true),
		verifiableCredentialCreate: vi
			.fn()
			.mockImplementation(async (verificationMethodId: string, id: unknown, subject: unknown) => ({
				verifiableCredential: membershipCredential(verificationMethodId.split("#")[0], subject),
				jwt: "unused.credential.jwt"
			})),
		verifiableCredentialVerify: vi
			.fn()
			.mockImplementation(async (credential: unknown) => verifyTestCredential(credential))
	} as unknown as IIdentityComponent;
}

describe("EntityStorageAuthenticationAccountService", () => {
	beforeAll(() => {
		registerAccountDataVerifiers();
	});

	let storage: MemoryEntityStorageConnector<AccountData>;
	let requests: MemoryEntityStorageConnector<OrganizationRequest>;
	let organizations: MemoryEntityStorageConnector<Organization>;
	let service: EntityStorageAuthenticationAccountService;
	let admin: EntityStorageAuthenticationAccountAdminService;
	let identityComponent: IIdentityComponent;
	let rateService: {
		className: () => string;
		registerAction: ReturnType<typeof vi.fn>;
		unregisterAction: ReturnType<typeof vi.fn>;
		check: ReturnType<typeof vi.fn>;
	};

	beforeEach(async () => {
		storage = new MemoryEntityStorageConnector<AccountData>({
			entitySchema: nameof<AccountData>(),
			config: { storageKey: "account-data" }
		});
		requests = new MemoryEntityStorageConnector<OrganizationRequest>({
			entitySchema: nameof<OrganizationRequest>(),
			config: { storageKey: "organization-request-account" }
		});
		organizations = await createOrganizationStorage("organization-account", [
			"did:example:org",
			"did:example:org-1",
			"did:example:org-2",
			"did:example:org-3"
		]);
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
		identityComponent = createIdentityComponent();
		rateService = {
			className: () => "rate",
			registerAction: vi.fn(),
			unregisterAction: vi.fn(),
			check: vi.fn()
		};
		vi.spyOn(ComponentFactory, "getIfExists").mockImplementation(name => {
			if (name === "identity-service") {
				return identityComponent;
			}
			if (name === "authentication-rate") {
				return rateService;
			}
			return undefined;
		});
		mockRequiredComponents({
			authorization: createAuthorizationComponent(),
			"authentication-rate": rateService,
			"identity-service": identityComponent
		});
		service = new EntityStorageAuthenticationAccountService();
		admin = new EntityStorageAuthenticationAccountAdminService();
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		await storage.teardown();
		await requests.teardown();
		await organizations.teardown();
	});

	it("should store and read items of the types the account may set", async () => {
		await asAccount("account-1", async () => {
			const profileId = await service.create("profile", { name: "Alice" });

			await expect(service.get(profileId)).resolves.toMatchObject({
				accountId: "account-1",
				type: "profile",
				data: { name: "Alice" },
				dateCreated: expect.any(String),
				dateModified: expect.any(String)
			});
		});
	});

	it("should keep one row per item, so a list type has many rows", async () => {
		await asAccount("account-1", async () => {
			await service.create("address", { id: "address-1" });
			await service.create("address", { id: "address-2" });
			await service.create("profile", { name: "Alice" });

			const result = await service.query("address");

			expect(result.entities.map(e => e.data)).toEqual([{ id: "address-1" }, { id: "address-2" }]);
		});
	});

	it("should let an account store, change and remove its own verifiable credentials", async () => {
		await asAccount("account-1", async () => {
			const vcId = await service.create("vc", credentialData("vc-1"));
			await service.update(vcId, credentialData("vc-x"));
			await expect(service.query("vc")).resolves.toMatchObject({
				entities: [{ id: vcId, data: credentialData("vc-x") }]
			});
			await service.remove(vcId);
			await expect(service.query("vc")).resolves.toMatchObject({ entities: [] });
		});
	});

	it("should only store a verifiable credential as a JSON credential object", async () => {
		await asAccount("account-1", async () => {
			const credential = membershipCredential("did:example:org", { id: "did:example:1" });
			const id = await service.create("vc", credential);
			await expect(service.get(id)).resolves.toMatchObject({ data: credential });

			const { proof, ...withoutProof } = credential;
			expect(proof).toBeDefined();
			for (const data of [
				"eyJhbGciOiJFZERTQSJ9.eyJpc3MiOiJkaWQ6ZXhhbXBsZTpvcmcifQ.c2ln",
				"not-a-jwt",
				{
					"@context": "https://www.w3.org/ns/credentials/v2",
					type: "EnvelopedVerifiableCredential",
					id: `data:${MimeTypes.VerifiableCredentialJwt},a.b.c`
				},
				{ id: "vc-1" },
				withoutProof,
				{ ...credential, proof: "z-signature" },
				{ ...credential, "@context": undefined },
				{ ...credential, issuer: undefined },
				{ ...credential, credentialSubject: undefined },
				{ ...credentialData("vc-1"), type: ["Other"] }
			]) {
				await expect(service.create("vc", data)).rejects.toMatchObject({
					name: "UnprocessableError",
					message: "accountDataHelper.credentialDataInvalid"
				});
			}
			await expect(service.update(id, "a.b.c")).rejects.toMatchObject({
				message: "accountDataHelper.credentialDataInvalid"
			});
		});
	});

	it("should only store a JSON object as the value of any other type", async () => {
		await asAccount("account-1", async () => {
			for (const data of ["text", 1, true, [{ a: 1 }], null]) {
				await expect(service.create("my-type", data)).rejects.toMatchObject({
					name: "UnprocessableError",
					message: "accountDataHelper.accountDataNotObject",
					properties: { type: "my-type" }
				});
			}
			const id = await service.create("my-type", { a: 1 });
			await expect(service.update(id, "text")).rejects.toMatchObject({
				message: "accountDataHelper.accountDataNotObject"
			});
		});
	});

	it("should store types in kebab case, so a variant of a reserved type stays reserved", async () => {
		await asAccount("account-1", async () => {
			for (const type of ["Identity", " identity", "Organization", "Migration"]) {
				await expect(service.create(type, "did:example:x")).rejects.toMatchObject({
					name: "ForbiddenError",
					message: "entityStorageAuthenticationAccountService.reservedType"
				});
			}
			await expect(service.create("   ", { a: 1 })).rejects.toThrow();

			const profileId = await service.create(" ContactDetails ", { name: "Alice" });
			const vcId = await service.create("Vc", credentialData("vc-1"));
			const customId = await service.create("myType", { a: 1 });

			await expect(service.get(profileId)).resolves.toMatchObject({ type: "contact-details" });
			await expect(service.get(vcId)).resolves.toMatchObject({ type: "vc" });
			await expect(service.get(customId)).resolves.toMatchObject({ type: "my-type" });
			for (const type of ["MyType", "my_type", "my type", "my-type"]) {
				await expect(service.query(type)).resolves.toMatchObject({
					entities: [{ id: customId }]
				});
			}
			await expect(service.query("contactDetails")).resolves.toMatchObject({
				entities: [{ id: profileId }]
			});
		});
	});

	it("should convert a type to kebab case", () => {
		for (const [type, expected] of [
			["contactDetails", "contact-details"],
			["ContactDetails", "contact-details"],
			["contact_details", "contact-details"],
			[" contact details ", "contact-details"],
			["Identity", "identity"],
			["IPAddress", "i-p-address"],
			["address2Line", "address2-line"],
			["urn:example:Thing", "urn-example-thing"]
		]) {
			expect(AccountDataHelper.normaliseType(type)).toBe(expected);
		}
		expect(() => AccountDataHelper.normaliseType("  ")).toThrow();
	});

	it("should treat a stored variant of a reserved type as reserved", async () => {
		// A row stored before types were checked, the variant can not be changed by the account.
		const now = new Date().toISOString();
		await storage.set({
			id: "variant",
			accountId: "account-1",
			type: "Identity",
			data: "did:example:mine",
			isDefault: true,
			dateCreated: now,
			dateModified: now
		});

		await asAccount("account-1", async () => {
			await expect(service.update("variant", "did:example:x")).rejects.toMatchObject({
				name: "ForbiddenError"
			});
			await expect(service.remove("variant")).rejects.toMatchObject({ name: "ForbiddenError" });
			// The variant is not the identity of the account.
			await expect(service.query("identity")).resolves.toMatchObject({ entities: [] });
		});
	});

	it("should check an item of a type with the verifier registered for it, and any other as a JSON object", async () => {
		AccountDataValidationFactory.register("supply-chain", () => ({
			verify: async (data: unknown) => {
				if (!Is.object<{ consignment?: unknown }>(data) || !Is.stringValue(data.consignment)) {
					throw new UnprocessableError("SupplyChainVerifier", "consignmentMissing");
				}
			},
			maxInstances: () => undefined
		}));
		try {
			await asAccount("account-1", async () => {
				// The type is normalised before its verifier is looked up.
				await expect(
					service.create("supplyChain", { name: "no consignment" })
				).rejects.toMatchObject({
					name: "UnprocessableError",
					message: "supplyChainVerifier.consignmentMissing"
				});
				await expect(
					service.create("supply-chain", { consignment: "CONS-1" })
				).resolves.toBeDefined();
				await expect(service.create("notes", "not an object")).rejects.toMatchObject({
					name: "UnprocessableError",
					message: "accountDataHelper.accountDataNotObject"
				});
			});
		} finally {
			AccountDataValidationFactory.unregister("supply-chain");
		}
	});

	it("should hold the most items of a type its verifier allows, replacing a type it allows one of", async () => {
		AccountDataValidationFactory.register("signature", () => ({
			verify: async () => {},
			maxInstances: () => 1
		}));
		AccountDataValidationFactory.register("address", () => ({
			verify: async () => {},
			maxInstances: () => 2
		}));
		try {
			await asAccount("account-1", async () => {
				const first = await service.create("signature", { text: "A" });
				// A second item replaces the first, which stays the default.
				await expect(service.create("signature", { text: "B" })).resolves.toBe(first);
				const signatures = await service.query("signature");
				expect(signatures.entities).toHaveLength(1);
				expect(signatures.entities[0]).toMatchObject({ data: { text: "B" }, isDefault: true });

				await service.create("address", { line: "1" });
				await service.create("address", { line: "2" });
				await expect(service.create("address", { line: "3" })).rejects.toMatchObject({
					name: "UnprocessableError",
					message: "entityStorageAuthenticationAccountService.accountDataTypeLimitReached",
					properties: { type: "address", maxItems: 2 }
				});
			});

			// The admin service applies the same limits.
			const replaced = await admin.create("account-2", "signature", { text: "A" });
			await expect(admin.create("account-2", "signature", { text: "B" })).resolves.toBe(replaced);
			await admin.create("account-2", "address", { line: "1" });
			await admin.create("account-2", "address", { line: "2" });
			await expect(admin.create("account-2", "address", { line: "3" })).rejects.toMatchObject({
				name: "UnprocessableError",
				message: "entityStorageAuthenticationAccountAdminService.accountDataTypeLimitReached",
				properties: { type: "address", maxItems: 2 }
			});
		} finally {
			AccountDataValidationFactory.unregister("signature");
			AccountDataValidationFactory.unregister("address");
		}
	});

	it("should update and remove its own items", async () => {
		await asAccount("account-1", async () => {
			const id = await service.create("profile", { name: "Alice" });

			await service.update(id, { name: "Bob" });
			await expect(service.get(id)).resolves.toMatchObject({ data: { name: "Bob" } });

			await service.remove(id);
			await expect(service.get(id)).rejects.toThrow(NotFoundError);
		});
	});

	it("should not let the account change a profile owned by the authentication provider", async () => {
		const privateId = await admin.create(
			"account-1",
			"profile",
			AuthenticationAccountHelper.markReadOnly({ email: "alice@example.com" }),
			true
		);

		await asAccount("account-1", async () => {
			await expect(
				service.update(privateId, { email: "mallory@example.com" })
			).rejects.toMatchObject({
				name: "ForbiddenError",
				message: "entityStorageAuthenticationAccountService.readOnly"
			});
			await expect(service.remove(privateId)).rejects.toMatchObject({ name: "ForbiddenError" });
			await expect(
				service.create("profile", { email: "mallory@example.com" }, true)
			).rejects.toMatchObject({ name: "ForbiddenError" });

			// Other types can still be stored.
			await expect(service.create("contact-details", { name: "Alice" })).resolves.toBeDefined();
			await expect(service.create("address", { id: "address-1" })).resolves.toBeDefined();
		});
		await expect(admin.get(privateId)).resolves.toMatchObject({
			data: { email: "alice@example.com", readonlyValue: true }
		});
	});

	it("should not let another profile become the default in place of one owned by the provider", async () => {
		await admin.create(
			"account-1",
			"profile",
			AuthenticationAccountHelper.markReadOnly({ name: "Provider" }),
			true
		);
		const otherId = await admin.create("account-1", "profile", { name: "Mine" });

		await asAccount("account-1", async () => {
			await expect(service.update(otherId, { name: "Mine" }, true)).rejects.toMatchObject({
				name: "ForbiddenError",
				message: "entityStorageAuthenticationAccountService.readOnly"
			});
			// The profile can still be changed without becoming the default.
			await expect(service.update(otherId, { name: "Mine 2" })).resolves.toBeUndefined();
		});
	});

	it("should limit the items an account stores, in all and by type", async () => {
		expect(EntityStorageAuthenticationAccountService.DEFAULT_MAX_ITEMS).toBe(1000);
		expect(EntityStorageAuthenticationAccountService.DEFAULT_MAX_ITEMS_BY_TYPE).toEqual({
			vc: 200
		});
		service = new EntityStorageAuthenticationAccountService({
			config: { maxItems: 3, maxItemsByType: { Address: 1 } }
		});

		await asAccount("account-1", async () => {
			await service.create("address", { line: "1" });
			await expect(service.create("address", { line: "2" })).rejects.toMatchObject({
				name: "UnprocessableError",
				message: "entityStorageAuthenticationAccountService.accountDataTypeLimitReached",
				properties: { type: "address", maxItems: 1 }
			});
			await service.create("phone", { number: "1" });
			await service.create("vc", credentialData("vc-1"));
			await expect(service.create("note", { text: "1" })).rejects.toMatchObject({
				name: "UnprocessableError",
				message: "entityStorageAuthenticationAccountService.accountDataLimitReached",
				properties: { maxItems: 3 }
			});
		});
		// Other accounts have their own limits.
		await asAccount("account-2", async () => {
			await expect(service.create("address", { line: "1" })).resolves.toBeDefined();
		});
	});

	it("should not let the account set its own identity or organization", async () => {
		const identityId = await admin.create("account-1", "identity", identityData("did:example:1"));
		const organizationId = await admin.create(
			"account-1",
			"organization",
			organizationData("did:example:org")
		);

		await asAccount("account-1", async () => {
			for (const type of ["identity", "organization"]) {
				await expect(service.create(type, "did:example:admin")).rejects.toMatchObject({
					name: "ForbiddenError",
					message: "entityStorageAuthenticationAccountService.reservedType"
				});
			}
			for (const id of [identityId, organizationId]) {
				await expect(service.update(id, "did:example:admin")).rejects.toMatchObject({
					name: "ForbiddenError"
				});
				await expect(service.remove(id)).rejects.toMatchObject({ name: "ForbiddenError" });
			}
			await expect(service.query("identity")).resolves.toMatchObject({
				entities: [{ data: identityData("did:example:1") }]
			});
		});
	});

	it("should not reveal, change or remove the items of another account", async () => {
		const otherId = await asAccount("account-2", async () =>
			service.create("profile", { name: "Other" })
		);

		await asAccount("account-1", async () => {
			await expect(service.get(otherId)).rejects.toThrow(NotFoundError);
			await expect(service.update(otherId, { name: "Mine" })).rejects.toThrow(NotFoundError);
			await expect(service.remove(otherId)).rejects.toThrow(NotFoundError);
			await expect(service.query()).resolves.toEqual({ entities: [], cursor: undefined });
		});

		await expect(admin.get(otherId)).resolves.toMatchObject({ data: { name: "Other" } });
	});

	it("should require a signed in account", async () => {
		await expect(service.create("profile", {})).rejects.toThrow();
		await expect(service.query()).rejects.toThrow();
		await expect(service.adoptIdentity(undefined, undefined, nowSeconds())).rejects.toThrow();
	});

	it("should require a type and a value", async () => {
		await asAccount("account-1", async () => {
			await expect(service.create("", {})).rejects.toThrow();
			await expect(service.create("profile", undefined)).rejects.toThrow();
		});
	});

	it("should register the adopt identity rate limit when started", async () => {
		await service.start();
		await service.stop();

		expect(rateService.registerAction).toHaveBeenCalledWith("adopt-identity", {
			maxAttempts: 5,
			windowMinutes: 15
		});
		expect(rateService.unregisterAction).toHaveBeenCalledWith("adopt-identity");
	});

	describe("adoptIdentity", () => {
		it("should create a self-controlled identity when none is given", async () => {
			await asAccount("account-1", async () => {
				await expect(service.adoptIdentity(undefined, undefined, nowSeconds())).resolves.toBe(
					"did:example:created"
				);
				await expect(service.query("identity")).resolves.toMatchObject({
					entities: [
						{
							id: AccountDataHelper.identityId("did:example:created"),
							data: identityData("did:example:created"),
							isDefault: true
						}
					]
				});
			});
			expect(identityComponent.identityCreate).toHaveBeenCalledWith(undefined, undefined, {
				selfControlled: true
			});
		});

		it("should check the account once and not look up a created DID when adopting", async () => {
			const querySpy = vi.spyOn(storage, "query");
			const getSpy = vi.spyOn(storage, "get");

			await asAccount("account-1", async () =>
				service.adoptIdentity(undefined, undefined, nowSeconds())
			);

			// One read for the identity of the account, and one for its pending organizations.
			expect(querySpy).toHaveBeenCalledTimes(2);
			expect(getSpy).not.toHaveBeenCalled();
		});

		it("should check a given DID once and refuse an account with an identity before the proof", async () => {
			const querySpy = vi.spyOn(storage, "query");
			const getSpy = vi.spyOn(storage, "get");

			await asAccount("account-1", async () =>
				service.adoptIdentity("did:example:owned", proofFor("did:example:owned"), nowSeconds())
			);
			expect(querySpy).toHaveBeenCalledTimes(2);
			expect(getSpy).toHaveBeenCalledTimes(1);

			vi.mocked(identityComponent.proofVerify).mockClear();
			await asAccount("account-1", async () => {
				await expect(
					service.adoptIdentity("did:example:other", proofFor("did:example:other"), nowSeconds())
				).rejects.toMatchObject({
					name: "ConflictError",
					message: "accountDataHelper.identityAlreadyAssigned"
				});
			});
			expect(identityComponent.proofVerify).not.toHaveBeenCalled();
		});

		it("should rate limit adopting an identity by account", async () => {
			rateService.check.mockRejectedValueOnce(new UnauthorizedError("test", "tooMany"));

			await asAccount("account-1", async () => {
				await expect(service.adoptIdentity(undefined, undefined, nowSeconds())).rejects.toThrow(
					UnauthorizedError
				);
			});
			expect(rateService.check).toHaveBeenCalledWith("adopt-identity", "account-1");
			expect(identityComponent.identityCreate).not.toHaveBeenCalled();
		});

		it("should adopt a given identity with a proof by that identity over the account", async () => {
			const proof = proofFor("did:example:owned");

			await asAccount("account-1", async () => {
				await expect(service.adoptIdentity("did:example:owned", proof, nowSeconds())).resolves.toBe(
					"did:example:owned"
				);
			});

			expect(identityComponent.proofVerify).toHaveBeenCalledWith(
				AuthenticationAccountHelper.identityProofDocument("account-1", "did:example:owned"),
				proof
			);
			expect(identityComponent.identityCreate).not.toHaveBeenCalled();
		});

		it("should bind the proof to the node when it is known", async () => {
			const proof = proofFor("did:example:owned");

			await ContextIdStore.run(
				{ [ContextIdKeys.Account]: "account-1", [ContextIdKeys.Node]: "did:example:node" },
				async () => service.adoptIdentity("did:example:owned", proof, nowSeconds())
			);

			expect(identityComponent.proofVerify).toHaveBeenCalledTimes(1);
			expect(identityComponent.proofVerify).toHaveBeenCalledWith(
				AuthenticationAccountHelper.identityProofDocument(
					"account-1",
					"did:example:owned",
					"did:example:node"
				),
				proof
			);
		});

		it("should accept a proof with any purpose and method of the DID, without the node", async () => {
			const legacy = {
				...proofFor("did:example:owned"),
				verificationMethod: "did:example:owned#assert-1",
				proofPurpose: "assertionMethod"
			};
			// Only the document without the node verifies, as a previous client signed it.
			vi.mocked(identityComponent.proofVerify).mockImplementation(
				async document => !("instrument" in document)
			);

			await ContextIdStore.run(
				{ [ContextIdKeys.Account]: "account-1", [ContextIdKeys.Node]: "did:example:node" },
				async () => {
					await expect(
						service.adoptIdentity("did:example:owned", legacy, nowSeconds())
					).resolves.toBe("did:example:owned");
				}
			);
			expect(identityComponent.proofVerify).toHaveBeenLastCalledWith(
				AuthenticationAccountHelper.identityProofDocument("account-1", "did:example:owned"),
				legacy
			);
		});

		it("should refuse a DID held by the node or an organization", async () => {
			await organizations.set({
				id: "org-1",
				identity: "did:example:registered",
				searchName: "",
				dateCreated: new Date().toISOString(),
				dateModified: new Date().toISOString()
			});

			await ContextIdStore.run(
				{
					[ContextIdKeys.Account]: "account-1",
					[ContextIdKeys.Node]: "did:example:node",
					[ContextIdKeys.Organization]: "did:example:tenant-org"
				},
				async () => {
					for (const did of [
						"did:example:node",
						"did:example:tenant-org",
						"did:example:registered"
					]) {
						await expect(
							service.adoptIdentity(did, proofFor(did), nowSeconds())
						).rejects.toMatchObject({
							name: "ConflictError",
							message: "accountDataHelper.identityHeldByNode"
						});
					}
				}
			);
			expect(identityComponent.proofVerify).not.toHaveBeenCalled();
			await organizations.teardown();
		});

		it("should refuse a given identity without a valid proof by that identity", async () => {
			await asAccount("account-1", async () => {
				await expect(
					service.adoptIdentity("did:example:owned", undefined, nowSeconds())
				).rejects.toThrow(UnauthorizedError);
				await expect(
					service.adoptIdentity("did:example:owned", proofFor("did:example:other"), nowSeconds())
				).rejects.toThrow(UnauthorizedError);

				vi.mocked(identityComponent.proofVerify).mockResolvedValueOnce(false);
				await expect(
					service.adoptIdentity("did:example:owned", proofFor("did:example:owned"), nowSeconds())
				).rejects.toThrow(UnauthorizedError);

				vi.mocked(identityComponent.proofVerify).mockRejectedValueOnce(new Error("bad proof"));
				await expect(
					service.adoptIdentity("did:example:owned", proofFor("did:example:owned"), nowSeconds())
				).rejects.toThrow(UnauthorizedError);

				await expect(service.query("identity")).resolves.toMatchObject({ entities: [] });
			});
		});

		it("should refuse a proof that is old, from the future or has no date", async () => {
			const old = new Date(Date.now() - SIX_MINUTES_MS).toISOString();
			const future = new Date(Date.now() + FIVE_MINUTES_MS).toISOString();
			const undated = { ...proofFor("did:example:owned"), created: undefined };

			await asAccount("account-1", async () => {
				for (const proof of [
					proofFor("did:example:owned", old),
					proofFor("did:example:owned", future),
					undated
				]) {
					await expect(
						service.adoptIdentity("did:example:owned", proof, nowSeconds())
					).rejects.toMatchObject({
						name: "UnauthorizedError",
						message: "identityProofHelper.identityProofExpired"
					});
				}
			});
			expect(identityComponent.proofVerify).not.toHaveBeenCalled();
		});

		it("should accept an older proof when the window is configured", async () => {
			service = new EntityStorageAuthenticationAccountService({
				config: { identityProofMaxAgeSeconds: 600 }
			});
			const old = new Date(Date.now() - SIX_MINUTES_MS).toISOString();

			await asAccount("account-1", async () => {
				await expect(
					service.adoptIdentity(
						"did:example:owned",
						proofFor("did:example:owned", old),
						nowSeconds()
					)
				).resolves.toBe("did:example:owned");
			});
		});

		it("should allow only one identity for an account", async () => {
			await asAccount("account-1", async () => {
				await service.adoptIdentity(undefined, undefined, nowSeconds());
				await expect(service.adoptIdentity(undefined, undefined, nowSeconds())).rejects.toThrow(
					ConflictError
				);
				await expect(
					service.adoptIdentity("did:example:owned", proofFor("did:example:owned"), nowSeconds())
				).rejects.toThrow(ConflictError);
			});
			expect(identityComponent.identityCreate).toHaveBeenCalledTimes(1);
		});

		it("should serialise concurrent adoptions for an account", async () => {
			const results = await asAccount("account-1", async () =>
				Promise.allSettled([
					service.adoptIdentity(undefined, undefined, nowSeconds()),
					service.adoptIdentity(undefined, undefined, nowSeconds())
				])
			);

			expect(results.map(r => r.status).sort()).toEqual(["fulfilled", "rejected"]);
			expect(identityComponent.identityCreate).toHaveBeenCalledTimes(1);
		});

		it("should not let two accounts hold the same identity", async () => {
			await asAccount("account-1", async () =>
				service.adoptIdentity("did:example:owned", proofFor("did:example:owned"), nowSeconds())
			);

			await asAccount("account-2", async () => {
				await expect(
					service.adoptIdentity("did:example:owned", proofFor("did:example:owned"), nowSeconds())
				).rejects.toMatchObject({
					name: "ConflictError",
					message: "accountDataHelper.identityInUse"
				});
			});
		});

		it("should not let two accounts adopt the same identity at once", async () => {
			const results = await Promise.allSettled([
				asAccount("account-1", async () =>
					service.adoptIdentity("did:example:owned", proofFor("did:example:owned"), nowSeconds())
				),
				asAccount("account-2", async () =>
					service.adoptIdentity("did:example:owned", proofFor("did:example:owned"), nowSeconds())
				)
			]);

			expect(results.map(r => r.status).sort()).toEqual(["fulfilled", "rejected"]);
			expect(results.find(r => r.status === "rejected")).toMatchObject({
				reason: { name: "ConflictError", message: "accountDataHelper.identityInUse" }
			});
			expect((await admin.query(undefined, "identity")).entities).toHaveLength(1);
		});

		it("should keep the identity when issuing a pending membership credential fails", async () => {
			const logging = { className: () => "logging", log: vi.fn() };
			vi.mocked(ComponentFactory.getIfExists).mockImplementation(name => {
				if (name === "identity-service") {
					return identityComponent;
				}
				return name === "logging" ? logging : undefined;
			});
			service = new EntityStorageAuthenticationAccountService();
			await admin.create("account-1", "organization", organizationData("did:example:org-1"));
			await admin.create("account-1", "organization", organizationData("did:example:org-2"));
			vi.mocked(identityComponent.verifiableCredentialCreate).mockRejectedValueOnce(
				new Error("keys not held")
			);

			await asAccount("account-1", async () => {
				await expect(service.adoptIdentity(undefined, undefined, nowSeconds())).resolves.toBe(
					"did:example:created"
				);
				// Both memberships are kept, the one that failed is without a credential.
				expect((await service.query("organization")).entities).toHaveLength(2);
				expect((await service.query("vc")).entities).toHaveLength(1);
			});
			expect(logging.log).toHaveBeenCalledWith(
				expect.objectContaining({
					level: "warn",
					source: "PendingMembershipHelper",
					message: "membershipCredentialFailed",
					data: { accountId: "account-1", organization: "did:example:org-1" }
				})
			);
		});

		it("should issue the credentials of organizations the account was added to before", async () => {
			await admin.create("account-1", "organization", organizationData("did:example:org"));
			expect(identityComponent.verifiableCredentialCreate).not.toHaveBeenCalled();

			await asAccount("account-1", async () =>
				service.adoptIdentity(undefined, undefined, nowSeconds())
			);

			expect(identityComponent.verifiableCredentialCreate).toHaveBeenCalledTimes(1);
			await expect(
				OrganizationMembershipHelper.hasCredential(
					storage,
					identityComponent,
					"account-1",
					"did:example:org"
				)
			).resolves.toBe(true);
		});

		it("should ignore forged, revoked or mismatched credentials and issue a valid one", async () => {
			const membership = (identity: string): unknown => ({
				id: identity,
				memberOf: { "@type": "Organization", id: "did:example:org" }
			});
			for (const credential of [
				membershipCredential(
					"did:example:org",
					membership("did:example:created"),
					undefined,
					"forged"
				),
				membershipCredential(
					"did:example:org",
					membership("did:example:created"),
					undefined,
					"revoked"
				),
				membershipCredential("did:example:mallory", membership("did:example:created")),
				membershipCredential("did:example:org", membership("did:example:someone-else"))
			]) {
				await AccountDataHelper.create(storage, "account-1", "vc", credential);
			}
			await admin.create("account-1", "organization", organizationData("did:example:org"));

			await asAccount("account-1", async () =>
				service.adoptIdentity(undefined, undefined, nowSeconds())
			);

			expect(identityComponent.verifiableCredentialCreate).toHaveBeenCalledTimes(1);
			await expect(
				OrganizationMembershipHelper.hasCredential(
					storage,
					identityComponent,
					"account-1",
					"did:example:org"
				)
			).resolves.toBe(true);
		});

		it("should remove a created identity when it cannot be stored", async () => {
			vi.spyOn(storage, "set").mockRejectedValueOnce(new Error("save failed"));

			await asAccount("account-1", async () => {
				await expect(service.adoptIdentity(undefined, undefined, nowSeconds())).rejects.toThrow(
					"save failed"
				);
			});
			expect(identityComponent.identityRemove).toHaveBeenCalledWith(
				"did:example:created",
				{ removeKeys: true, removeDocumentKey: true },
				"did:example:created"
			);
		});

		it("should fail when the identity component does not return a DID", async () => {
			vi.mocked(identityComponent.identityCreate).mockResolvedValueOnce({
				"@context": "https://www.w3.org/ns/did/v1",
				id: "not-a-did"
			});
			await asAccount("account-1", async () => {
				await expect(
					service.adoptIdentity(undefined, undefined, nowSeconds())
				).rejects.toMatchObject({
					message: "entityStorageAuthenticationAccountService.identityCreateFailed"
				});
			});
		});

		it("should fail to construct without the identity component", async () => {
			vi.mocked(ComponentFactory.get).mockImplementation(() => {
				throw new GeneralError("Factory", "noGet");
			});
			expect(() => new EntityStorageAuthenticationAccountService()).toThrow(GeneralError);
		});
	});

	it("should require an identity to ask to join an organization", async () => {
		await asAccount("account-1", async () => {
			await expect(service.joinOrganization("did:example:org")).rejects.toThrow(UnprocessableError);
		});
	});

	it("should use the organization set on the request without reading storage", async () => {
		const querySpy = vi.spyOn(storage, "query");
		const requestQuerySpy = vi.spyOn(requests, "query");

		await expect(
			asAccount("account-1", async () => service.getOrganization(), undefined, "did:example:org")
		).resolves.toBe("did:example:org");
		expect(querySpy).not.toHaveBeenCalled();
		expect(requestQuerySpy).not.toHaveBeenCalled();
	});

	it("should read the requests of the account once for its organization and request", async () => {
		const now = Date.now();
		for (const [id, status, offset] of [
			["request-1", "rejected", 2 * DurationConstants.MsPerSecond],
			["request-2", "pending", DurationConstants.MsPerSecond]
		] as const) {
			const date = new Date(now - offset).toISOString();
			await requests.set({
				id,
				accountId: "account-1",
				organization: "did:example:org",
				status,
				dateCreated: date,
				dateModified: date
			});
		}
		const requestQuerySpy = vi.spyOn(requests, "query");

		await asAccount("account-1", async () => {
			await expect(service.getOrganization()).resolves.toBeUndefined();
			// The latest request to the organization is the pending one.
			await expect(service.getOrganizationRequests()).resolves.toMatchObject([{ id: "request-2" }]);
		});
		expect(requestQuerySpy).toHaveBeenCalledTimes(2);
	});

	it("should require the organization to be a DID", async () => {
		await asAccount("account-1", async () => {
			await expect(service.joinOrganization("not-a-did")).rejects.toMatchObject({
				name: "GuardError"
			});
		});
	});
});

describe("EntityStorageAuthenticationAccountAdminService", () => {
	let storage: MemoryEntityStorageConnector<AccountData>;
	let admin: EntityStorageAuthenticationAccountAdminService;

	let organizations: MemoryEntityStorageConnector<Organization>;
	let requests: MemoryEntityStorageConnector<OrganizationRequest>;

	beforeEach(async () => {
		storage = new MemoryEntityStorageConnector<AccountData>({
			entitySchema: nameof<AccountData>(),
			config: { storageKey: "account-data-admin" }
		});
		requests = new MemoryEntityStorageConnector<OrganizationRequest>({
			entitySchema: nameof<OrganizationRequest>(),
			config: { storageKey: "organization-request-admin" }
		});
		organizations = await createOrganizationStorage("organization-admin", [
			"did:example:org",
			"did:example:org-1",
			"did:example:org-2",
			"did:example:org-3",
			"did:example:x",
			"did:example:other"
		]);
		const users = createUserStorage();
		vi.spyOn(EntityStorageConnectorFactory, "get").mockImplementation(name => {
			if (name === "organization") {
				return organizations as never;
			}
			if (name === "organization-request") {
				return requests as never;
			}
			return (name === "authentication-user" ? users : storage) as never;
		});
		mockRequiredComponents({
			authorization: createAuthorizationComponent(),
			"identity-service": createIdentityComponent(),
			"authentication-rate": createRateComponent()
		});
		admin = new EntityStorageAuthenticationAccountAdminService();
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		await storage.teardown();
		await organizations.teardown();
		await requests.teardown();
	});

	it("should manage the items of any account", async () => {
		const id = await admin.create("account-1", "profile", { name: "Alice" });
		await admin.create("account-2", "organization", organizationData("did:example:org-2"));

		await admin.update(id, { name: "Bob" });
		await expect(admin.get(id)).resolves.toMatchObject({
			accountId: "account-1",
			data: { name: "Bob" }
		});

		await admin.remove(id);
		await expect(admin.get(id)).rejects.toThrow(NotFoundError);
	});

	it("should keep a single default per type when one is set", async () => {
		const first = await admin.create("account-1", "profile", { name: "One" }, true);
		const second = await admin.create("account-1", "profile", { name: "Two" }, true);
		const other = await admin.create("account-2", "profile", { name: "Three" }, true);

		await expect(admin.get(first)).resolves.toMatchObject({ isDefault: false });
		await expect(admin.get(second)).resolves.toMatchObject({ isDefault: true });
		await expect(admin.get(other)).resolves.toMatchObject({ isDefault: true });

		await admin.update(first, { name: "One" }, true);
		await expect(admin.get(first)).resolves.toMatchObject({ isDefault: true });
		await expect(admin.get(second)).resolves.toMatchObject({ isDefault: false });

		await admin.update(first, { name: "One b" });
		await expect(admin.get(first)).resolves.toMatchObject({
			data: { name: "One b" },
			isDefault: true
		});
	});

	it("should keep a single default organization and not change its value", async () => {
		const first = await admin.create(
			"account-1",
			"organization",
			organizationData("did:example:org-1"),
			true
		);
		const second = await admin.create(
			"account-1",
			"organization",
			organizationData("did:example:org-2"),
			true
		);

		await expect(admin.get(first)).resolves.toMatchObject({ isDefault: false });
		await expect(admin.get(second)).resolves.toMatchObject({ isDefault: true });

		await admin.update(first, organizationData("did:example:org-1"), true);
		await expect(admin.get(first)).resolves.toMatchObject({ isDefault: true });
		await expect(admin.update(first, organizationData("did:example:org-3"))).rejects.toMatchObject({
			name: "UnprocessableError",
			message: "entityStorageAuthenticationAccountAdminService.organizationImmutable"
		});
		await expect(admin.update(first, "did:example:org-1")).rejects.toMatchObject({
			name: "UnprocessableError",
			message: "accountDataHelper.organizationDataInvalid"
		});
	});

	it("should only store an organization as a schema.org Organization identified by a DID", async () => {
		for (const data of [
			"did:example:org",
			organizationData("not-a-did"),
			{ ...organizationData("did:example:org"), "@type": "Person" },
			{ ...organizationData("did:example:org"), "@context": "https://www.w3.org/ns/did/v1" },
			{ "@context": "https://schema.org", "@type": "Organization", id: "did:example:org" }
		]) {
			await expect(admin.create("account-1", "organization", data)).rejects.toMatchObject({
				name: "UnprocessableError",
				message: "accountDataHelper.organizationDataInvalid"
			});
		}
		await expect(
			admin.create("account-1", "organization", organizationData("did:example:org"))
		).resolves.toEqual(expect.any(String));
		await expect(admin.query("account-1", "organization")).resolves.toMatchObject({
			entities: [
				{
					data: {
						"@context": "https://schema.org",
						"@type": "Organization",
						identifier: "did:example:org"
					}
				}
			]
		});
	});

	it("should store items as not the default unless asked", async () => {
		const id = await admin.create("account-1", "vc", credentialData("vc-1"));

		await expect(admin.get(id)).resolves.toMatchObject({ isDefault: false });
	});

	it("should keep one identity per account and one account per identity", async () => {
		const id = await admin.create("account-1", "identity", identityData("did:example:1"));

		await expect(admin.get(id)).resolves.toMatchObject({ isDefault: true });
		await expect(
			admin.create("account-1", "identity", identityData("did:example:2"))
		).rejects.toThrow(ConflictError);
		await expect(
			admin.create("account-2", "identity", identityData("did:example:1"))
		).rejects.toThrow(ConflictError);
		for (const data of [
			"did:example:3",
			{ id: "did:example:3" },
			identityData("not-a-did"),
			{ ...identityData("did:example:3"), "@context": "https://schema.org" },
			{ "@context": "https://www.w3.org/ns/did/v1", id: 3 }
		]) {
			await expect(admin.create("account-2", "identity", data)).rejects.toMatchObject({
				name: "UnprocessableError",
				message: "accountDataHelper.identityDataInvalid"
			});
		}
		await expect(admin.get(id)).resolves.toMatchObject({
			data: { "@context": "https://www.w3.org/ns/did/v1", id: "did:example:1" }
		});
	});

	it("should not change the DID of an identity, only replace it", async () => {
		const id = await admin.create("account-1", "identity", identityData("did:example:1"));

		await expect(admin.update(id, identityData("did:example:2"))).rejects.toMatchObject({
			message: "entityStorageAuthenticationAccountAdminService.identityImmutable"
		});
		await expect(admin.update(id, "did:example:1")).rejects.toMatchObject({
			message: "accountDataHelper.identityDataInvalid"
		});
		await admin.update(id, identityData("did:example:1"), true);

		await admin.remove(id);
		await expect(
			admin.create("account-1", "identity", identityData("did:example:2"))
		).resolves.toBe(AccountDataHelper.identityId("did:example:2"));
	});

	it("should query by account and type", async () => {
		await admin.create("account-1", "identity", identityData("did:example:1"));
		await admin.create("account-1", "vc", credentialData("vc-1"));
		await admin.create("account-2", "identity", identityData("did:example:2"));

		expect((await admin.query("account-1")).entities).toHaveLength(2);
		expect(
			(await admin.query(undefined, "identity")).entities
				.map(e => AuthenticationAccountHelper.getIdentity(e.data))
				.sort()
		).toEqual(["did:example:1", "did:example:2"]);
		expect((await admin.query()).entities).toHaveLength(3);
	});

	it("should keep the node migration records out of listings and self-service", async () => {
		await AccountDataHelper.create(storage, "migration", "migration", { kind: "account" });
		const ownMigrationId = await AccountDataHelper.create(storage, "account-1", "migration", {
			kind: "roles"
		});
		await admin.create("account-1", "vc", credentialData("vc-1"));

		expect((await admin.query()).entities.map(e => e.type)).toEqual(["vc"]);
		expect((await admin.query(undefined, "migration")).entities).toHaveLength(2);
		await ContextIdStore.run({ [ContextIdKeys.Account]: "account-1" }, async () => {
			const self = new EntityStorageAuthenticationAccountService();
			await expect(self.create("migration", { kind: "account" })).rejects.toMatchObject({
				name: "ForbiddenError"
			});
			// The records of the account itself are not listed or returned either.
			expect((await self.query()).entities.map(e => e.type)).toEqual(["vc"]);
			await expect(self.query("Migration")).resolves.toEqual({ entities: [] });
			await expect(self.get(ownMigrationId)).rejects.toMatchObject({
				name: "NotFoundError",
				message: "accountDataHelper.accountDataNotFound"
			});
		});
	});

	it("should require an account id", async () => {
		await expect(admin.create("", "vc", credentialData("vc-1"))).rejects.toThrow();
	});

	it("should handle a variant of a known type as the known type", async () => {
		await admin.create("account-1", "Organization", organizationData("did:example:org-1"));
		await expect(admin.query("account-1", " organization")).resolves.toMatchObject({
			entities: [{ type: "organization", data: organizationData("did:example:org-1") }]
		});

		await admin.create("account-1", "Vc ", credentialData("vc-1"));
		await expect(admin.query("account-1", "vc")).resolves.toMatchObject({
			entities: [{ type: "vc", data: credentialData("vc-1") }]
		});
	});

	describe("escalated privilege and scoped admins", () => {
		// Roles are held by account ids, so a DID grants no privilege.
		const ESCALATED_ACCOUNT = "admin-account";
		const ADMIN_IDENTITY = "did:example:global-admin";
		const ORGANIZATION = "did:example:org";
		let authorization: IAuthorizationComponent;
		let identityComponent: IIdentityComponent;
		let guarded: EntityStorageAuthenticationAccountAdminService;

		/**
		 * Run a function as an admin without escalated privilege, an org admin of the organization.
		 * @param fn The function to run.
		 * @param identity The identity of the caller, if any.
		 * @returns The result of the function.
		 */
		async function asUserAdmin<T>(fn: () => Promise<T>, identity?: string): Promise<T> {
			return asAccount("user-admin", fn, identity, ORGANIZATION);
		}

		beforeEach(async () => {
			const roles: { [subject: string]: string[] } = {
				[ESCALATED_ACCOUNT]: ["global-admin"],
				"user-admin": ["user-admin", `org-admin:${ORGANIZATION}`]
			};
			authorization = {
				hasRoleForSubject: vi.fn(
					async (modelId: string, subject: string, role: string) =>
						roles[subject]?.includes(role) ?? false
				),
				getRolesForSubject: vi.fn(async (modelId: string, subject: string) => roles[subject] ?? []),
				removeRoleForSubject: vi.fn()
			} as unknown as IAuthorizationComponent;
			identityComponent = createIdentityComponent();
			vi.spyOn(ComponentFactory, "getIfExists").mockImplementation(name => {
				if (name === "authorization") {
					return authorization;
				}
				if (name === "identity-service") {
					return identityComponent;
				}
				return undefined;
			});
			guarded = new EntityStorageAuthenticationAccountAdminService();
			await AccountDataHelper.createIdentity(storage, ESCALATED_ACCOUNT, ADMIN_IDENTITY);
			await AccountDataHelper.create(
				storage,
				ESCALATED_ACCOUNT,
				"organization",
				organizationData(ORGANIZATION)
			);
			await AccountDataHelper.create(
				storage,
				"plain-account",
				"organization",
				organizationData(ORGANIZATION)
			);
			await AccountDataHelper.create(
				storage,
				"outside-account",
				"organization",
				organizationData("did:example:x")
			);
			await AccountDataHelper.create(
				storage,
				"user-admin",
				"organization",
				organizationData(ORGANIZATION)
			);
		});

		it("should forbid changing the identity or organization of an escalated account", async () => {
			const identityId = AccountDataHelper.identityId(ADMIN_IDENTITY);
			const page = await admin.query(ESCALATED_ACCOUNT, "organization");
			const organizationId = page.entities[0].id;

			await asUserAdmin(async () => {
				await expect(
					guarded.create(ESCALATED_ACCOUNT, "organization", organizationData(ORGANIZATION))
				).rejects.toMatchObject({
					name: "ForbiddenError",
					message:
						"entityStorageAuthenticationAccountAdminService.insufficientRoleForEscalatedTarget"
				});
				await expect(
					guarded.update(organizationId, organizationData(ORGANIZATION), true)
				).rejects.toMatchObject({
					name: "ForbiddenError"
				});
				await expect(guarded.remove(identityId)).rejects.toMatchObject({
					name: "ForbiddenError"
				});
			});

			// A call without a caller account is a system call.
			await guarded.remove(organizationId);
			await expect(guarded.get(organizationId)).rejects.toThrow(NotFoundError);
		});

		it("should treat a stored variant of a reserved type as reserved", async () => {
			const now = new Date().toISOString();
			await storage.set({
				id: "variant",
				accountId: ESCALATED_ACCOUNT,
				type: "Organization",
				data: ORGANIZATION,
				isDefault: false,
				dateCreated: now,
				dateModified: now
			});

			await asUserAdmin(async () => {
				await expect(guarded.remove("variant")).rejects.toMatchObject({ name: "ForbiddenError" });
				await expect(guarded.update("variant", "did:example:y")).rejects.toMatchObject({
					name: "ForbiddenError"
				});
			});
		});

		it("should not treat the DID in the context as the caller", async () => {
			await asUserAdmin(async () => {
				await expect(
					guarded.create(ESCALATED_ACCOUNT, "organization", organizationData(ORGANIZATION))
				).rejects.toMatchObject({ name: "ForbiddenError" });
			}, ESCALATED_ACCOUNT);
		});

		it("should require a recent proof for a caller without escalated privilege to bind an identity", async () => {
			await asUserAdmin(async () => {
				await expect(
					guarded.create("plain-account", "identity", identityData("did:example:plain"))
				).rejects.toThrow(UnauthorizedError);
				await expect(
					guarded.create(
						"plain-account",
						"identity",
						identityData("did:example:plain"),
						undefined,
						proofFor("did:example:plain", "2020-01-01T00:00:00.000Z")
					)
				).rejects.toMatchObject({ message: "identityProofHelper.identityProofExpired" });

				await expect(
					guarded.create(
						"plain-account",
						"identity",
						identityData("did:example:plain"),
						undefined,
						proofFor("did:example:plain")
					)
				).resolves.toBe(AccountDataHelper.identityId("did:example:plain"));
			});
			expect(identityComponent.proofVerify).toHaveBeenCalledWith(
				AuthenticationAccountHelper.identityProofDocument("plain-account", "did:example:plain"),
				expect.any(Object)
			);
			// The membership credential of the organization is issued when the identity is bound.
			await expect(
				OrganizationMembershipHelper.hasCredential(
					storage,
					identityComponent,
					"plain-account",
					ORGANIZATION
				)
			).resolves.toBe(true);
		});

		it("should not require a proof from a caller with escalated privilege", async () => {
			await asAccount(ESCALATED_ACCOUNT, async () => {
				await expect(
					guarded.create("outside-account", "identity", identityData("did:example:outside"))
				).resolves.toBe(AccountDataHelper.identityId("did:example:outside"));
			});
			expect(identityComponent.proofVerify).not.toHaveBeenCalled();
		});

		it("should refuse to bind a DID held by the node, even for a system call", async () => {
			await ContextIdStore.run({ [ContextIdKeys.Node]: "did:example:node" }, async () => {
				await expect(
					guarded.create("outside-account", "identity", identityData("did:example:node"))
				).rejects.toMatchObject({
					name: "ConflictError",
					message: "accountDataHelper.identityHeldByNode"
				});
			});
		});

		it("should let a caller without escalated privilege manage only the members of its organizations", async () => {
			const plainId = await admin.create("plain-account", "profile", { name: "X" });
			const outsideId = await admin.create("outside-account", "profile", { name: "X" });

			await asUserAdmin(async () => {
				await expect(guarded.create("plain-account", "note", { text: "Y" })).resolves.toBeDefined();
				await expect(guarded.get(plainId)).resolves.toMatchObject({ data: { name: "X" } });
				await guarded.update(plainId, { name: "Z" });
				expect((await guarded.query("plain-account")).entities).toHaveLength(3);
				const accounts = new Set((await guarded.query()).entities.map(item => item.accountId));
				expect([...accounts].sort()).toEqual([ESCALATED_ACCOUNT, "plain-account", "user-admin"]);
				await expect(guarded.getManagedAccounts()).resolves.toEqual(
					expect.arrayContaining([ESCALATED_ACCOUNT, "plain-account", "user-admin"])
				);
				await guarded.remove(plainId);

				// The accounts outside its organizations are reported as missing.
				await expect(guarded.get(outsideId)).rejects.toMatchObject({ name: "NotFoundError" });
				await expect(guarded.update(outsideId, { name: "Z" })).rejects.toMatchObject({
					name: "NotFoundError"
				});
				await expect(guarded.remove(outsideId)).rejects.toMatchObject({ name: "NotFoundError" });
				await expect(
					guarded.create("outside-account", "profile", { name: "Y" })
				).rejects.toMatchObject({
					name: "NotFoundError",
					message: "entityStorageAuthenticationAccountAdminService.userNotFound"
				});
				await expect(guarded.query("outside-account")).resolves.toEqual({ entities: [] });
			});

			// A caller with escalated privilege manages every account.
			await asAccount(ESCALATED_ACCOUNT, async () => {
				await expect(guarded.getManagedAccounts()).resolves.toBeUndefined();
				await expect(guarded.get(outsideId)).resolves.toBeDefined();
			});
		});

		it("should keep and change the items only admins may see", async () => {
			await asUserAdmin(async () => {
				const id = await guarded.create(
					"plain-account",
					"note",
					{ text: "Secret" },
					undefined,
					undefined,
					true
				);
				await expect(guarded.get(id)).resolves.toMatchObject({ adminOnly: true });
				await guarded.update(id, { text: "Changed" });
				await expect(guarded.get(id)).resolves.toMatchObject({
					data: { text: "Changed" },
					adminOnly: true
				});
				await guarded.update(id, { text: "Open" }, undefined, false);
				await expect(guarded.get(id)).resolves.not.toHaveProperty("adminOnly", true);
			});
		});

		it("should not let a caller without escalated privilege change their own identity or organization", async () => {
			await asUserAdmin(async () => {
				await expect(
					guarded.create("user-admin", "organization", organizationData(ORGANIZATION))
				).rejects.toMatchObject({
					name: "ForbiddenError",
					message: "entityStorageAuthenticationAccountAdminService.ownAccountNotPermitted"
				});
				await expect(
					guarded.create(
						"user-admin",
						"identity",
						identityData("did:example:self"),
						undefined,
						proofFor("did:example:self")
					)
				).rejects.toMatchObject({ name: "ForbiddenError" });
				// Other items of their own account can still be managed.
				await expect(
					guarded.create("user-admin", "profile", { name: "Admin" })
				).resolves.toBeDefined();
			});

			await asAccount(ESCALATED_ACCOUNT, async () => {
				await expect(
					guarded.create(ESCALATED_ACCOUNT, "organization", organizationData("did:example:other"))
				).resolves.toBeDefined();
			});
		});

		it("should only let a caller with escalated privilege write the node migration records", async () => {
			const record = {
				kind: "account",
				email: "x@example.com",
				accountId: "user-admin",
				roles: ["global-admin"]
			};
			const existingId = await admin.create("migration", "migration", record);

			await asUserAdmin(async () => {
				await expect(guarded.create("migration", "migration", record)).rejects.toMatchObject({
					name: "ForbiddenError",
					message: "entityStorageAuthenticationAccountAdminService.migrationTypeNotPermitted"
				});
				await expect(guarded.update(existingId, record)).rejects.toMatchObject({
					name: "ForbiddenError"
				});
				await expect(guarded.remove(existingId)).rejects.toMatchObject({
					name: "ForbiddenError"
				});
			});

			await asAccount(ESCALATED_ACCOUNT, async () => {
				await guarded.remove(existingId);
			});
		});

		it("should let admins store, change and remove verifiable credentials", async () => {
			await asUserAdmin(async () => {
				const vcId = await guarded.create("plain-account", "vc", credentialData("vc-1"));
				await guarded.update(vcId, credentialData("vc-2"));
				await guarded.remove(vcId);
			});
		});
	});
});
