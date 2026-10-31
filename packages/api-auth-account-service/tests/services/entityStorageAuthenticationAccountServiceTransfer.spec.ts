// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import {
	AuthenticationAccountHelper,
	type IAccountIdentityExport,
	OrganizationRequestStatus
} from "@3sixty/api-auth-models";
import { ContextIdKeys, ContextIdStore } from "@3sixty/context";
import { ComponentFactory, GeneralError, Is } from "@3sixty/core";
import { MemoryEntityStorageConnector } from "@3sixty/entity-storage-connector-memory";
import {
	EntityStorageConnectorFactory,
	type IEntityStorageConnector
} from "@3sixty/entity-storage-models";
import { nameof } from "@3sixty/nameof";
import type { AccountData } from "../../src/entities/accountData.js";
import type { Organization } from "../../src/entities/organization.js";
import type { OrganizationRequest } from "../../src/entities/organizationRequest.js";
import { initSchema } from "../../src/schema.js";
import { EntityStorageAuthenticationAccountAdminService } from "../../src/services/entityStorageAuthenticationAccountAdminService.js";
import { EntityStorageAuthenticationAccountService } from "../../src/services/entityStorageAuthenticationAccountService.js";
import { AccountDataHelper } from "../../src/utils/accountDataHelper.js";
import { OrganizationHelper } from "../../src/utils/organizationHelper.js";
import {
	identityData,
	membershipCredential,
	organizationData
} from "../helpers/accountDataValues.js";
import {
	createFakeIdentityComponent,
	type IFakeIdentityComponent
} from "../helpers/fakeIdentityComponent.js";

initSchema();

const NODE = "did:example:node";
const ORGANIZATION = "did:example:organization";

/**
 * The type and version of an account identity export, without anything else.
 */
const IDENTITY_FILE = { type: "account-identity", version: 1 };

/**
 * Get the current time in seconds, a session that started now is recent.
 * @returns The time.
 */
function nowSeconds(): number {
	return Math.floor(Date.now() / 1000);
}

/**
 * Run a function as a signed in account.
 * @param accountId The account id.
 * @param fn The function to run.
 * @returns The result of the function.
 */
async function asAccount<T>(accountId: string, fn: () => Promise<T>): Promise<T> {
	return ContextIdStore.run({ [ContextIdKeys.Node]: NODE, [ContextIdKeys.Account]: accountId }, fn);
}

/**
 * Run a function as the system, such as the node CLI.
 * @param fn The function to run.
 * @returns The result of the function.
 */
async function asSystem<T>(fn: () => Promise<T>): Promise<T> {
	return ContextIdStore.run({ [ContextIdKeys.Node]: NODE }, fn);
}

describe("EntityStorageAuthenticationAccountService export and import", () => {
	let accountData: MemoryEntityStorageConnector<AccountData>;
	let requests: MemoryEntityStorageConnector<OrganizationRequest>;
	let organizations: MemoryEntityStorageConnector<Organization>;
	let identityComponent: IFakeIdentityComponent;
	let rateService: { className: () => string; check: ReturnType<typeof vi.fn> };
	let service: EntityStorageAuthenticationAccountService;
	let admin: EntityStorageAuthenticationAccountAdminService;

	beforeEach(async () => {
		accountData = new MemoryEntityStorageConnector<AccountData>({
			entitySchema: nameof<AccountData>(),
			config: { storageKey: "account-data-transfer" }
		});
		requests = new MemoryEntityStorageConnector<OrganizationRequest>({
			entitySchema: nameof<OrganizationRequest>(),
			config: { storageKey: "organization-request-transfer" }
		});
		organizations = new MemoryEntityStorageConnector<Organization>({
			entitySchema: nameof<Organization>(),
			config: { storageKey: "organization-transfer" }
		});
		EntityStorageConnectorFactory.register("account-data", () => accountData);
		EntityStorageConnectorFactory.register("organization-request", () => requests);
		EntityStorageConnectorFactory.register("organization", () => organizations);
		identityComponent = createFakeIdentityComponent();
		rateService = { className: () => "rate", check: vi.fn() };
		ComponentFactory.register("identity-service", () => identityComponent);
		ComponentFactory.register("authentication-rate", () => rateService);

		service = new EntityStorageAuthenticationAccountService();
		admin = new EntityStorageAuthenticationAccountAdminService();
		await OrganizationHelper.register(organizations, ORGANIZATION, "example");
	});

	afterEach(async () => {
		ComponentFactory.unregister("identity-service");
		ComponentFactory.unregister("authentication-rate");
		EntityStorageConnectorFactory.unregister("account-data");
		EntityStorageConnectorFactory.unregister("organization-request");
		EntityStorageConnectorFactory.unregister("organization");
		await accountData.teardown();
		await requests.teardown();
		await organizations.teardown();
	});

	/**
	 * Give an account a node held identity and a membership of the organization.
	 * @param accountId The account id.
	 * @returns The DID.
	 */
	async function setupMember(accountId: string): Promise<string> {
		const identity = await asAccount(accountId, async () =>
			service.adoptIdentity(undefined, undefined, nowSeconds())
		);
		await asSystem(async () =>
			admin.create(accountId, "organization", organizationData(ORGANIZATION))
		);
		return identity;
	}

	describe("recent sign in", () => {
		it("should refuse an export or removal without a recent sign in", async () => {
			await setupMember("account-1");
			for (const sessionStart of [undefined, nowSeconds() - 301]) {
				await asAccount("account-1", async () => {
					await expect(service.exportIdentity(sessionStart)).rejects.toMatchObject({
						name: "UnauthorizedError",
						message: "recentSignInHelper.recentSignInRequired",
						properties: { maxAgeSeconds: 300 }
					});
					await expect(service.removeIdentity(sessionStart)).rejects.toMatchObject({
						message: "recentSignInHelper.recentSignInRequired"
					});
				});
			}
			expect(identityComponent.identityExport).not.toHaveBeenCalled();
		});

		it("should use the configured window", async () => {
			service = new EntityStorageAuthenticationAccountService({
				config: { recentSignInSeconds: 30 }
			});
			await setupMember("account-1");
			await asAccount("account-1", async () => {
				await expect(service.exportIdentity(nowSeconds() - 60)).rejects.toMatchObject({
					message: "recentSignInHelper.recentSignInRequired",
					properties: { maxAgeSeconds: 30 }
				});
				await expect(service.exportIdentity(nowSeconds() - 10)).resolves.toBeDefined();
			});
		});
	});

	describe("identity", () => {
		it("should revoke the membership when removing the identity, so importing it again does not restore it", async () => {
			const identity = await setupMember("account-1");
			await asAccount("account-1", async () => {
				await service.create(
					"vc",
					membershipCredential(ORGANIZATION, { id: identity }, undefined, "forged")
				);
				await service.create("public-profile", { name: "Alice" });
				await requests.set({
					id: "request-1",
					accountId: "account-1",
					organization: "did:example:other",
					status: OrganizationRequestStatus.Pending,
					dateCreated: new Date().toISOString(),
					dateModified: new Date().toISOString()
				});

				const exported = await service.exportIdentity(nowSeconds());
				expect(exported.identity.document.id).toBe(identity);
				// The file holds the stored JSON credentials with their proofs.
				expect(exported.credentials).toHaveLength(2);
				expect(
					exported.credentials?.every(
						credential => Is.object<{ proof?: unknown }>(credential) && Is.object(credential.proof)
					)
				).toBe(true);
				expect(rateService.check).toHaveBeenCalledWith("export-identity", "account-1");

				await service.removeIdentity(nowSeconds());
				expect(identityComponent.held.has(identity)).toBe(false);
				expect(identityComponent.identityRemove).toHaveBeenLastCalledWith(
					identity,
					{ removeKeys: true, removeDocumentKey: true, retainDocument: true },
					identity
				);
				for (const type of ["identity", "organization", "vc"]) {
					await expect(service.query(type)).resolves.toMatchObject({ entities: [] });
				}
				// The profile stays, only the identity and what moves with it is removed.
				await expect(service.query("public-profile")).resolves.toMatchObject({
					entities: [{ data: { name: "Alice" } }]
				});
				await expect(requests.get("request-1")).resolves.toBeUndefined();
				await expect(service.getOrganization()).resolves.toBeUndefined();
				// The membership credential was issued with the first index of the organization, which
				// the node recorded and revoked.
				expect(identityComponent.verifiableCredentialRevoke).toHaveBeenCalledWith(
					ORGANIZATION,
					0,
					NODE
				);

				const result = await service.importIdentity(exported, nowSeconds());
				expect(result).toEqual({
					identity,
					credentialsImported: 0,
					credentialsSkipped: 2,
					organizations: []
				});
				expect(identityComponent.held.has(identity)).toBe(true);
				expect(identityComponent.identityImport).toHaveBeenCalledWith(exported.identity, identity);
				expect(rateService.check).toHaveBeenCalledWith("import-identity", "account-1");
				await expect(service.query("identity")).resolves.toMatchObject({
					entities: [{ data: identityData(identity) }]
				});
				await expect(service.query("vc")).resolves.toMatchObject({ entities: [] });
				await expect(service.getOrganization()).resolves.toBeUndefined();
			});
			expect(identityComponent.verifiableCredentialCreate).toHaveBeenCalledTimes(1);
			expect(identityComponent.verifiableCredentialCreate).toHaveBeenCalledWith(
				`${ORGANIZATION}#trust-assertion`,
				undefined,
				expect.anything(),
				{ revocationIndex: 0, types: ["OrganizationMembershipCredential"] },
				ORGANIZATION
			);
		});

		it("should restore a revocable membership when the identity moves to another node", async () => {
			const identity = await setupMember("account-1");
			const exported = await asAccount("account-1", async () =>
				service.exportIdentity(nowSeconds())
			);
			// The export holds the stored JSON credential as it is.
			const issued = await asAccount("account-1", async () => service.query("vc"));
			expect(exported.credentials).toEqual([issued.entities[0].data]);
			expect(exported.credentials?.[0]).toMatchObject({
				issuer: ORGANIZATION,
				credentialStatus: { revocationBitmapIndex: "0" },
				proof: { type: "DataIntegrityProof" }
			});
			// Another node holds neither the account data nor the keys, and nothing was revoked.
			await accountData.empty();
			identityComponent.held.delete(identity);

			await asAccount("account-2", async () => {
				await expect(service.importIdentity(exported, nowSeconds())).resolves.toEqual({
					identity,
					credentialsImported: 1,
					credentialsSkipped: 0,
					organizations: [ORGANIZATION]
				});
				await expect(service.getOrganization()).resolves.toBe(ORGANIZATION);
				await expect(service.query("vc")).resolves.toMatchObject({
					entities: [{ data: exported.credentials?.[0] }]
				});
				expect(identityComponent.verifiableCredentialVerify).toHaveBeenCalledWith(
					exported.credentials?.[0]
				);

				// The index of the imported credential was recorded, so leaving revokes it.
				await service.leaveOrganization(ORGANIZATION);
				await expect(service.query("vc")).resolves.toMatchObject({ entities: [] });
			});
			expect(identityComponent.verifiableCredentialRevoke).toHaveBeenCalledWith(
				ORGANIZATION,
				0,
				NODE
			);
			expect(identityComponent.revoked.has(`${ORGANIZATION}:0`)).toBe(true);
		});

		it("should import a membership credential without a revocation status as a credential only", async () => {
			const identity = await setupMember("account-1");
			const exported = await asAccount("account-1", async () =>
				service.exportIdentity(nowSeconds())
			);
			const withoutStatus = membershipCredential(ORGANIZATION, {
				id: identity,
				memberOf: { "@type": "Organization", id: ORGANIZATION }
			});
			const asObject = {
				"@context": "https://www.w3.org/ns/credentials/v2",
				type: ["VerifiableCredential"],
				issuer: "did:example:issuer",
				credentialSubject: { id: identity },
				proof: { type: "DataIntegrityProof", proofValue: "z-signature" }
			};
			// Only JSON credentials are imported, a JWT, an enveloped credential, a credential without
			// a proof and one without a context and type are skipped.
			exported.credentials = [
				withoutStatus,
				asObject,
				{ ...asObject },
				withoutStatus,
				{ issuer: "did:example:issuer", credentialSubject: { id: identity } },
				"eyJhbGciOiJFZERTQSJ9.eyJpc3MiOiJkaWQ6ZXhhbXBsZTppc3N1ZXIifQ.c2ln",
				{
					"@context": "https://www.w3.org/ns/credentials/v2",
					type: "EnvelopedVerifiableCredential",
					id: "data:application/vc+jwt,a.b.c"
				},
				{ ...asObject, proof: undefined }
			];
			await accountData.empty();
			identityComponent.held.delete(identity);

			await asAccount("account-2", async () => {
				await expect(service.importIdentity(exported, nowSeconds())).resolves.toEqual({
					identity,
					credentialsImported: 4,
					credentialsSkipped: 4,
					organizations: []
				});
				await expect(service.query("organization")).resolves.toMatchObject({ entities: [] });
				// A credential is only stored once.
				const credentials = await service.query("vc");
				expect(credentials.entities.map(item => item.data)).toEqual([withoutStatus, asObject]);
			});
		});

		it("should map a DID the node already holds to a conflict", async () => {
			const identity = await setupMember("account-1");
			const exported = await asAccount("account-1", async () =>
				service.exportIdentity(nowSeconds())
			);
			await accountData.empty();

			await asAccount("account-2", async () => {
				await expect(service.importIdentity(exported, nowSeconds())).rejects.toMatchObject({
					name: "ConflictError",
					message: "entityStorageAuthenticationAccountService.identityImportConflict",
					properties: { conflictId: identity }
				});
			});
			// The identity the node already held is left.
			expect(identityComponent.held.has(identity)).toBe(true);
		});

		it("should refuse an export whose keys do not match as unprocessable", async () => {
			const identity = await setupMember("account-1");
			const exported = await asAccount("account-1", async () =>
				service.exportIdentity(nowSeconds())
			);
			await accountData.empty();
			identityComponent.held.delete(identity);
			vi.mocked(identityComponent.identityImport).mockRejectedValue(
				new GeneralError(
					"identityService",
					"identityImportFailed",
					undefined,
					new GeneralError("entityStorageIdentityConnector", "keyMismatch")
				)
			);

			const expected = {
				name: "UnprocessableError",
				message: "entityStorageAuthenticationAccountService.identityExportInvalid",
				cause: { message: "identityService.identityImportFailed" }
			};
			await asAccount("account-2", async () => {
				await expect(service.importIdentity(exported, nowSeconds())).rejects.toMatchObject(
					expected
				);
				await expect(service.query("identity")).resolves.toMatchObject({ entities: [] });
			});
			await expect(
				asSystem(async () => admin.importIdentity("account-3", exported))
			).rejects.toMatchObject(expected);
		});

		it("should refuse an adoption or import without a recent sign in", async () => {
			await asAccount("account-1", async () => {
				for (const sessionStart of [undefined, nowSeconds() - 301, nowSeconds() + 3600]) {
					await expect(
						service.adoptIdentity(undefined, undefined, sessionStart)
					).rejects.toMatchObject({
						name: "UnauthorizedError",
						message: "recentSignInHelper.recentSignInRequired"
					});
					await expect(
						service.importIdentity(IDENTITY_FILE as never, sessionStart)
					).rejects.toMatchObject({
						name: "UnauthorizedError",
						message: "recentSignInHelper.recentSignInRequired"
					});
				}
			});
			expect(identityComponent.identityCreate).not.toHaveBeenCalled();
			expect(identityComponent.identityImport).not.toHaveBeenCalled();
		});

		it("should skip credentials issued to another identity and not join unregistered issuers", async () => {
			const identity = await setupMember("account-1");
			const other = membershipCredential(ORGANIZATION, {
				id: "did:example:someone",
				memberOf: { "@type": "Organization", id: ORGANIZATION }
			});
			const unregistered = membershipCredential("did:example:unregistered", {
				id: identity,
				memberOf: { "@type": "Organization", id: "did:example:unregistered" }
			});
			await asAccount("account-1", async () => {
				const exported = await service.exportIdentity(nowSeconds());
				exported.credentials = [other, unregistered, 42];
				await service.removeIdentity(nowSeconds());

				await expect(service.importIdentity(exported, nowSeconds())).resolves.toEqual({
					identity,
					credentialsImported: 1,
					credentialsSkipped: 2,
					organizations: []
				});
				await expect(service.query("organization")).resolves.toMatchObject({ entities: [] });
			});
		});

		it("should refuse another kind of file, or another version, before anything else", async () => {
			const exported = await asAccount("account-1", async () => {
				await setupMember("account-1");
				return service.exportIdentity(nowSeconds());
			});
			expect(exported).toMatchObject(IDENTITY_FILE);

			await asAccount("account-2", async () => {
				for (const [file, message, properties] of [
					[undefined, "fileTypeMismatch", { expected: "account-identity" }],
					[exported.identity, "fileTypeMismatch", { expected: "account-identity" }],
					[
						{ ...exported, type: "account-profile" },
						"fileTypeMismatch",
						{ expected: "account-identity", actual: "account-profile" }
					],
					[
						{ ...exported, type: "x".repeat(65) },
						"fileTypeMismatch",
						{ expected: "account-identity", actual: undefined }
					],
					[{ ...exported, version: 2 }, "fileVersionUnsupported", { version: 2, supported: 1 }]
				] as const) {
					// Refused before the recent sign in, so the session start is left out.
					await expect(service.importIdentity(file as never)).rejects.toMatchObject({
						name: "UnprocessableError",
						message: `exportFileHelper.${message}`,
						properties
					});
				}
			});
			expect(rateService.check).not.toHaveBeenCalledWith("import-identity", "account-2");
			expect(identityComponent.identityImport).not.toHaveBeenCalled();
		});

		it("should refuse an export that is not valid or not self-controlled", async () => {
			await asAccount("account-1", async () => {
				for (const exported of [IDENTITY_FILE, { ...IDENTITY_FILE, identity: { document: {} } }]) {
					await expect(
						service.importIdentity(exported as never, nowSeconds())
					).rejects.toMatchObject({
						name: "UnprocessableError",
						message: "entityStorageAuthenticationAccountService.identityExportInvalid"
					});
				}
				await expect(
					service.importIdentity(
						{
							type: "account-identity",
							version: 1,
							identity: {
								version: 1,
								namespace: "entity-storage",
								selfControlled: false,
								document: {
									"@context": "https://www.w3.org/ns/did/v1",
									id: "did:entity-storage:0x9"
								},
								keys: [{ id: "did", type: "Ed25519", privateKey: "secret", publicKey: "p" }]
							}
						},
						nowSeconds()
					)
				).rejects.toSatisfy((error: unknown) => {
					expect(error).toMatchObject({
						message: "entityStorageAuthenticationAccountService.identityNotSelfControlled"
					});
					// The keys are never put in an error.
					expect(JSON.stringify(error)).not.toContain("secret");
					return true;
				});
			});
			expect(identityComponent.identityImport).not.toHaveBeenCalled();
		});

		it("should refuse too many credentials", async () => {
			service = new EntityStorageAuthenticationAccountService({
				config: { identityImportMaxCredentials: 1 }
			});
			await asAccount("account-1", async () => {
				await expect(
					service.importIdentity(
						{
							type: "account-identity",
							version: 1,
							identity: {
								version: 1,
								namespace: "entity-storage",
								selfControlled: true,
								document: {
									"@context": "https://www.w3.org/ns/did/v1",
									id: "did:entity-storage:0x9"
								},
								keys: []
							},
							credentials: ["a", "b"]
						},
						nowSeconds()
					)
				).rejects.toMatchObject({
					message: "entityStorageAuthenticationAccountService.identityImportTooManyCredentials"
				});
			});
		});

		it("should refuse an import into an account that has an identity, or of a DID held", async () => {
			const identity = await setupMember("account-1");
			const exported = await asAccount("account-1", async () =>
				service.exportIdentity(nowSeconds())
			);

			await asAccount("account-1", async () => {
				await expect(service.importIdentity(exported, nowSeconds())).rejects.toMatchObject({
					name: "ConflictError",
					message: "accountDataHelper.identityAlreadyAssigned"
				});
			});
			await asAccount("account-2", async () => {
				await expect(service.importIdentity(exported, nowSeconds())).rejects.toMatchObject({
					name: "ConflictError",
					message: "accountDataHelper.identityInUse"
				});
				const organization: IAccountIdentityExport = {
					...exported,
					identity: {
						...exported.identity,
						document: { ...exported.identity.document, id: ORGANIZATION }
					}
				};
				await expect(service.importIdentity(organization, nowSeconds())).rejects.toMatchObject({
					message: "accountDataHelper.identityHeldByNode"
				});
			});
			expect(identityComponent.identityImport).not.toHaveBeenCalled();
			expect(identityComponent.held.has(identity)).toBe(true);
		});

		it("should remove the imported identity from the node when binding it fails", async () => {
			const identity = await setupMember("account-1");
			const exported = await asAccount("account-1", async () =>
				service.exportIdentity(nowSeconds())
			);
			// Moved to another node, so the membership credential is not revoked.
			await accountData.empty();
			identityComponent.held.delete(identity);

			const set = accountData.set.bind(accountData);
			vi.spyOn(accountData, "set").mockImplementation(async item => {
				if (item.type === "organization") {
					throw new Error("storage failed");
				}
				return set(item);
			});
			// A failing step of the rollback does not stop the others or hide the error.
			const remove = accountData.remove.bind(accountData);
			vi.spyOn(accountData, "remove").mockImplementationOnce(async () => {
				throw new Error("remove failed");
			});
			await asAccount("account-2", async () => {
				await expect(service.importIdentity(exported, nowSeconds())).rejects.toThrow(
					"storage failed"
				);
				vi.mocked(accountData.remove).mockImplementation(remove);
				// Removing the identity item failed, the credential item after it was still removed.
				await expect(service.query("identity")).resolves.toMatchObject({
					entities: [{ data: identityData(identity) }]
				});
				await expect(service.query("vc")).resolves.toMatchObject({ entities: [] });
			});
			expect(identityComponent.held.has(identity)).toBe(false);
			expect(identityComponent.identityRemove).toHaveBeenLastCalledWith(
				identity,
				{ removeKeys: true, removeDocumentKey: true, retainDocument: true },
				identity
			);
		});

		it("should not remove an identity item of another account when undoing an import", async () => {
			const identity = await setupMember("account-1");
			const exported = await asAccount("account-1", async () =>
				service.exportIdentity(nowSeconds())
			);
			await accountData.empty();
			identityComponent.held.delete(identity);
			const identityItemId = AccountDataHelper.identityId(identity);

			// The item of the identity comes to belong to another account before the rollback.
			const set = accountData.set.bind(accountData);
			vi.spyOn(accountData, "set").mockImplementation(async item => {
				if (item.type === "organization") {
					const current = (await accountData.get(identityItemId)) as AccountData;
					await set({ ...current, accountId: "account-3" });
					throw new Error("storage failed");
				}
				return set(item);
			});
			await asAccount("account-2", async () => {
				await expect(service.importIdentity(exported, nowSeconds())).rejects.toThrow(
					"storage failed"
				);
			});
			await expect(accountData.get(identityItemId)).resolves.toMatchObject({
				accountId: "account-3"
			});
		});

		it("should refuse to export an identity whose keys the node does not hold", async () => {
			await asAccount("account-1", async () => {
				await service.adoptIdentity(
					"did:example:adopted",
					{
						type: "DataIntegrityProof",
						cryptosuite: "eddsa-jcs-2022",
						created: new Date().toISOString(),
						verificationMethod: "did:example:adopted#key-1",
						proofPurpose: "authentication",
						proofValue: "z123"
					},
					nowSeconds()
				);
				await expect(service.exportIdentity(nowSeconds())).rejects.toMatchObject({
					name: "UnprocessableError",
					message: "entityStorageAuthenticationAccountService.identityKeysNotHeld",
					properties: { identity: "did:example:adopted" }
				});

				// An adopted identity is only unbound.
				await service.removeIdentity(nowSeconds());
				await expect(service.query("identity")).resolves.toMatchObject({ entities: [] });
			});
		});

		it("should refuse to export or remove when the account has no identity", async () => {
			await asAccount("account-1", async () => {
				await expect(service.exportIdentity(nowSeconds())).rejects.toMatchObject({
					name: "NotFoundError",
					message: "entityStorageAuthenticationAccountService.identityNotFound"
				});
				await expect(service.removeIdentity(nowSeconds())).rejects.toMatchObject({
					name: "NotFoundError"
				});
			});
		});

		it("should keep the identity bound when removing it from the node fails", async () => {
			const identity = await setupMember("account-1");
			vi.mocked(identityComponent.identityRemove).mockRejectedValueOnce(new Error("vault down"));
			await asAccount("account-1", async () => {
				await expect(service.removeIdentity(nowSeconds())).rejects.toMatchObject({
					name: "GeneralError",
					message: "entityStorageAuthenticationAccountService.identityRemoveFailed"
				});
				await expect(service.query("identity")).resolves.toMatchObject({
					entities: [{ data: identityData(identity) }]
				});
			});
		});
	});

	describe("leave organization", () => {
		it("should remove the organization and its membership credentials, revoking only the recorded index", async () => {
			const identity = await setupMember("account-1");
			await asAccount("account-1", async () => {
				// A credential the account stored itself, with an index the node did not record.
				const stored = membershipCredential(
					ORGANIZATION,
					{ id: identity, memberOf: { id: ORGANIZATION } },
					5
				);
				await service.create("vc", stored);
				const forged = membershipCredential(
					ORGANIZATION,
					{ id: identity, memberOf: { id: ORGANIZATION } },
					6,
					"forged"
				);
				await service.create("vc", forged);
				const forSomeoneElse = membershipCredential(
					ORGANIZATION,
					{ id: "did:example:someone", memberOf: { id: ORGANIZATION } },
					7
				);
				await service.create("vc", forSomeoneElse);
				const other = membershipCredential("did:example:other", { id: identity });
				await service.create("vc", other);

				await service.leaveOrganization(ORGANIZATION);

				await expect(service.query("organization")).resolves.toMatchObject({ entities: [] });
				// Only the credentials that verify as membership of the account are removed.
				const credentials = await service.query("vc");
				expect(credentials.entities.map(item => item.data)).toEqual([
					forged,
					forSomeoneElse,
					other
				]);
				// Only the index recorded when the node issued the credential is revoked.
				expect(identityComponent.verifiableCredentialRevoke).toHaveBeenCalledTimes(1);
				expect(identityComponent.verifiableCredentialRevoke).toHaveBeenCalledWith(
					ORGANIZATION,
					0,
					NODE
				);
				await expect(service.getOrganization()).resolves.toBeUndefined();

				await expect(service.leaveOrganization(ORGANIZATION)).rejects.toMatchObject({
					name: "NotFoundError",
					message: "entityStorageAuthenticationAccountService.organizationNotJoined"
				});
				await expect(service.leaveOrganization("not-a-did")).rejects.toMatchObject({
					name: "GuardError"
				});
			});
		});

		it("should still leave when revoking fails", async () => {
			const identity = await setupMember("account-1");
			vi.mocked(identityComponent.verifiableCredentialRevoke).mockRejectedValueOnce(
				new Error("keys not held")
			);
			await asAccount("account-1", async () => {
				await service.create(
					"vc",
					membershipCredential(ORGANIZATION, { id: identity, memberOf: { id: ORGANIZATION } }, 7)
				);
				await service.leaveOrganization(ORGANIZATION);
				await expect(service.query("vc")).resolves.toMatchObject({ entities: [] });
			});
		});
	});

	describe("admin export and import", () => {
		it("should move an identity with its membership into another account", async () => {
			const identity = await setupMember("account-1");
			const exported = await asSystem(async () => admin.exportIdentity("account-1"));
			expect(exported).toMatchObject({
				type: "account-identity",
				version: 1,
				identity: { document: { id: identity } }
			});
			// As if moved to another node, which holds neither the account data nor the keys.
			await accountData.empty();
			identityComponent.held.delete(identity);

			await expect(
				asSystem(async () => admin.importIdentity("account-2", exported))
			).resolves.toEqual({
				identity,
				credentialsImported: 1,
				credentialsSkipped: 0,
				organizations: [ORGANIZATION]
			});
			await expect(asAccount("account-2", async () => service.getOrganization())).resolves.toBe(
				ORGANIZATION
			);
			// As for the account itself, an account with an identity can not import another.
			await expect(
				asSystem(async () => admin.importIdentity("account-2", exported))
			).rejects.toMatchObject({ name: "ConflictError" });
			// The admin does not count against the rate limit of the account.
			expect(rateService.check).not.toHaveBeenCalledWith("import-identity", expect.anything());
		});

		it("should create an identity for an account that has none, completing its memberships", async () => {
			await asSystem(async () =>
				admin.create("account-1", "organization", organizationData(ORGANIZATION))
			);

			const identity = await asSystem(async () => admin.createIdentity("account-1"));

			expect(identity).toMatch(/^did:/);
			await expect(
				asAccount("account-1", async () => service.query("identity"))
			).resolves.toMatchObject({ entities: [{ data: identityData(identity) }] });
			// The membership added before the identity now has its credential.
			await expect(asAccount("account-1", async () => service.query("vc"))).resolves.toMatchObject({
				entities: [{ type: "vc" }]
			});
			await expect(asSystem(async () => admin.createIdentity("account-1"))).rejects.toMatchObject({
				name: "ConflictError",
				message: "accountDataHelper.identityAlreadyAssigned"
			});
			await expect(
				asAccount("admin-1", async () => admin.createIdentity("admin-1"))
			).rejects.toMatchObject({
				message: "entityStorageAuthenticationAccountAdminService.ownAccountNotPermitted"
			});
		});

		it("should need a recent sign in by an admin to export an identity", async () => {
			await setupMember("account-1");

			for (const sessionStart of [undefined, nowSeconds() - 301]) {
				await expect(
					asAccount("admin-1", async () => admin.exportIdentity("account-1", sessionStart))
				).rejects.toMatchObject({
					name: "UnauthorizedError",
					message: "recentSignInHelper.recentSignInRequired"
				});
			}
			await expect(
				asAccount("admin-1", async () => admin.exportIdentity("account-1", nowSeconds()))
			).resolves.toMatchObject({ type: "account-identity" });
			await expect(asSystem(async () => admin.exportIdentity("account-3"))).rejects.toMatchObject({
				name: "NotFoundError"
			});
		});

		it("should check the type of a file before anything else", async () => {
			const profile = await asSystem(async () => admin.exportProfile("account-1"));
			const identityFile = { type: "account-identity", version: 1, identity: {} };

			await expect(
				asAccount("admin-1", async () => admin.importIdentity("admin-1", profile as never))
			).rejects.toMatchObject({ message: "exportFileHelper.fileTypeMismatch" });
			await expect(
				asAccount("admin-1", async () => admin.importProfile("account-1", identityFile as never))
			).rejects.toMatchObject({ message: "exportFileHelper.fileTypeMismatch" });
			// The import of a well typed file into the caller's own account is refused.
			await expect(
				asAccount("admin-1", async () => admin.importIdentity("admin-1", identityFile as never))
			).rejects.toMatchObject({
				name: "ForbiddenError",
				message: "entityStorageAuthenticationAccountAdminService.ownAccountNotPermitted"
			});
			await expect(
				asSystem(async () => admin.importProfile(ORGANIZATION, profile))
			).rejects.toMatchObject({
				message: "entityStorageAuthenticationAccountAdminService.organizationProfileManaged"
			});
		});

		it("should export and replace the profile of an account", async () => {
			await asAccount("account-1", async () =>
				service.create("public-profile", { name: "Old" }, true)
			);

			const exported = await asSystem(async () => admin.exportProfile("account-1"));
			expect(exported).toMatchObject({
				type: "account-profile",
				version: 1,
				items: [{ type: "public-profile", data: { name: "Old" } }]
			});

			await expect(
				asSystem(async () =>
					admin.importProfile("account-2", {
						...exported,
						items: [{ type: "public-profile", data: { name: "New" }, isDefault: true }]
					})
				)
			).resolves.toEqual({ itemsImported: 1, itemsRemoved: 0, skippedTypes: [] });
			await expect(
				asAccount("account-2", async () => service.query("public-profile"))
			).resolves.toMatchObject({ entities: [{ data: { name: "New" } }] });
		});
	});

	describe("admin unknown account", () => {
		let users: Set<string>;

		beforeEach(() => {
			users = new Set(["account-1", "admin-1"]);
			const userStorage = {
				className: () => "user",
				query: vi.fn(async (condition: { value: string }) => ({
					entities: users.has(condition.value) ? [{ accountId: condition.value }] : []
				}))
			} as unknown as IEntityStorageConnector;
			EntityStorageConnectorFactory.register("authentication-user", () => userStorage);
		});

		afterEach(() => {
			EntityStorageConnectorFactory.unregister("authentication-user");
		});

		it("should refuse an account that does not exist before changing anything", async () => {
			await setupMember("account-1");
			const identityFile = await asSystem(async () => admin.exportIdentity("account-1"));
			const profile = await asSystem(async () => admin.exportProfile("account-1"));
			const notFound = {
				name: "NotFoundError",
				message: "entityStorageAuthenticationAccountAdminService.userNotFound",
				properties: { notFoundId: "account-missing" }
			};
			vi.mocked(identityComponent.identityCreate).mockClear();
			vi.mocked(identityComponent.identityExport).mockClear();

			await asSystem(async () => {
				await expect(admin.createIdentity("account-missing")).rejects.toMatchObject(notFound);
				await expect(admin.importIdentity("account-missing", identityFile)).rejects.toMatchObject(
					notFound
				);
				await expect(admin.exportIdentity("account-missing")).rejects.toMatchObject(notFound);
				await expect(admin.exportProfile("account-missing")).rejects.toMatchObject(notFound);
				await expect(admin.importProfile("account-missing", profile)).rejects.toMatchObject(
					notFound
				);
			});
			expect(identityComponent.identityCreate).not.toHaveBeenCalled();
			expect(identityComponent.identityImport).not.toHaveBeenCalled();
			expect(identityComponent.identityExport).not.toHaveBeenCalled();
			await expect(admin.query("account-missing")).resolves.toMatchObject({ entities: [] });
		});

		it("should still refuse a registered organization as unprocessable", async () => {
			const profile = await asSystem(async () => admin.exportProfile("account-1"));
			const managed = {
				name: "UnprocessableError",
				message: "entityStorageAuthenticationAccountAdminService.organizationProfileManaged"
			};
			await asSystem(async () => {
				await expect(admin.createIdentity(ORGANIZATION)).rejects.toMatchObject(managed);
				await expect(
					admin.importIdentity(ORGANIZATION, IDENTITY_FILE as never)
				).rejects.toMatchObject(managed);
				await expect(admin.importProfile(ORGANIZATION, profile)).rejects.toMatchObject(managed);
				// The exports are refused the same way, before the account is looked up.
				await expect(admin.exportProfile(ORGANIZATION)).rejects.toMatchObject(managed);
				await expect(admin.exportIdentity(ORGANIZATION)).rejects.toMatchObject(managed);
			});
		});

		it("should manage an account that exists", async () => {
			await expect(asSystem(async () => admin.createIdentity("account-1"))).resolves.toMatch(
				/^did:/
			);
			await expect(asSystem(async () => admin.exportProfile("account-1"))).resolves.toMatchObject({
				type: "account-profile"
			});
		});
	});

	describe("admin removal", () => {
		it("should revoke the membership when an admin removes the organization of an account", async () => {
			await setupMember("account-1");
			const organizationItem = (
				await asAccount("account-1", async () => service.query("organization"))
			).entities[0];

			await asSystem(async () => admin.remove(organizationItem.id));

			expect(identityComponent.verifiableCredentialRevoke).toHaveBeenCalledWith(
				ORGANIZATION,
				0,
				NODE
			);
			await asAccount("account-1", async () => {
				await expect(service.query("organization")).resolves.toMatchObject({ entities: [] });
				await expect(service.query("vc")).resolves.toMatchObject({ entities: [] });
			});
		});

		it("should remove an identity as the account would when an admin removes it", async () => {
			const identity = await setupMember("account-1");
			await requests.set({
				id: "request-1",
				accountId: "account-1",
				organization: "did:example:other",
				status: OrganizationRequestStatus.Pending,
				dateCreated: new Date().toISOString(),
				dateModified: new Date().toISOString()
			});
			const identityItem = (await asAccount("account-1", async () => service.query("identity")))
				.entities[0];

			await asSystem(async () => admin.remove(identityItem.id));

			expect(identityComponent.held.has(identity)).toBe(false);
			expect(identityComponent.verifiableCredentialRevoke).toHaveBeenCalledWith(
				ORGANIZATION,
				0,
				NODE
			);
			await asAccount("account-1", async () => {
				for (const type of ["identity", "organization", "vc"]) {
					await expect(service.query(type)).resolves.toMatchObject({ entities: [] });
				}
			});
			await expect(requests.get("request-1")).resolves.toBeUndefined();
		});

		it("should keep the identity bound when an admin can not remove its keys", async () => {
			const identity = await setupMember("account-1");
			vi.mocked(identityComponent.identityRemove).mockRejectedValueOnce(new Error("vault down"));
			const identityItem = (await asAccount("account-1", async () => service.query("identity")))
				.entities[0];

			await expect(asSystem(async () => admin.remove(identityItem.id))).rejects.toMatchObject({
				name: "GeneralError",
				message: "entityStorageAuthenticationAccountAdminService.identityRemoveFailed",
				properties: { identity }
			});
			await asAccount("account-1", async () => {
				await expect(service.getOrganization()).resolves.toBe(ORGANIZATION);
			});
		});
	});

	describe("profile", () => {
		it("should export the profile without the identity, organizations or credentials", async () => {
			await setupMember("account-1");
			await asAccount("account-1", async () => {
				await service.create("public-profile", { name: "Alice" }, true);
				await service.create("address", { line: "1" });
				await service.create("address", { line: "2" }, true);

				const exported = await service.exportProfile();
				expect(exported.version).toBe(1);
				expect(exported.items.map(item => [item.type, item.data, item.isDefault])).toEqual([
					["public-profile", { name: "Alice" }, true],
					["address", { line: "1" }, false],
					["address", { line: "2" }, true]
				]);
				expect(rateService.check).toHaveBeenCalledWith("export-profile", "account-1");
			});
		});

		it("should replace the profile, keeping the order and the first default of each type", async () => {
			await setupMember("account-1");
			await asAccount("account-1", async () => {
				await service.create("public-profile", { name: "Old" });
				await service.create("address", { line: "old" });

				await expect(
					service.importProfile({
						type: "account-profile",
						version: 1,
						items: [
							{ type: "PublicProfile", data: { name: "New" }, isDefault: true },
							{ type: "address", data: { line: "a" } },
							{ type: "address", data: { line: "b" }, isDefault: true },
							{ type: "address", data: { line: "c" }, isDefault: true }
						]
					})
				).resolves.toEqual({ itemsImported: 4, itemsRemoved: 2, skippedTypes: [] });

				const exported = await service.exportProfile();
				expect(exported.items.map(item => [item.type, item.data, item.isDefault])).toEqual([
					["public-profile", { name: "New" }, true],
					["address", { line: "a" }, false],
					["address", { line: "b" }, true],
					["address", { line: "c" }, false]
				]);
				// The identity and organization are untouched.
				await expect(service.getOrganization()).resolves.toBe(ORGANIZATION);
				expect(rateService.check).toHaveBeenCalledWith("import-profile", "account-1");
			});
		});

		it("should keep a profile owned by the authentication provider", async () => {
			await asSystem(async () =>
				admin.create(
					"account-1",
					"public-profile",
					AuthenticationAccountHelper.markReadOnly({ name: "Provider" }),
					true
				)
			);
			await asAccount("account-1", async () => {
				await service.create("address", { line: "old" });

				await expect(
					service.importProfile({
						type: "account-profile",
						version: 1,
						items: [
							{ type: "public-profile", data: { name: "Mine" } },
							{
								type: "private-profile",
								data: AuthenticationAccountHelper.markReadOnly({ email: "a@b.c" })
							},
							{ type: "address", data: { line: "new" } }
						]
					})
				).resolves.toEqual({
					itemsImported: 1,
					itemsRemoved: 1,
					skippedTypes: ["public-profile", "private-profile"]
				});

				const exported = await service.exportProfile();
				expect(exported.items.map(item => item.data)).toEqual([
					AuthenticationAccountHelper.markReadOnly({ name: "Provider" }),
					{ line: "new" }
				]);
			});
		});

		it("should refuse an import that is not valid, holds a reserved type or is too large", async () => {
			service = new EntityStorageAuthenticationAccountService({
				config: { profileImportMaxItems: 2, profileImportMaxBytes: 100 }
			});
			await asAccount("account-1", async () => {
				await service.create("address", { line: "kept" });

				const refusals: [unknown, string][] = [
					[undefined, "exportFileHelper.fileTypeMismatch"],
					[{ version: 1, items: [] }, "exportFileHelper.fileTypeMismatch"],
					[
						{ type: "account-identity", version: 1, items: [] },
						"exportFileHelper.fileTypeMismatch"
					],
					[
						{ type: "account-profile", version: 2, items: [] },
						"exportFileHelper.fileVersionUnsupported"
					],
					[{ type: "account-profile", version: 1 }, "accountProfileHelper.profileInvalid"],
					[
						{
							version: 1,
							items: [
								{ type: "a", data: 1 },
								{ type: "a", data: 2 },
								{ type: "a", data: 3 }
							]
						},
						"profileTooManyItems"
					],
					[{ version: 1, items: [{ type: "a", data: "x".repeat(200) }] }, "profileTooLarge"],
					[{ version: 1, items: [{ type: "  ", data: 1 }] }, "profileItemInvalid"],
					[{ version: 1, items: [{ type: "a" }] }, "profileItemInvalid"],
					[{ version: 1, items: [{ type: "a", data: 1, isDefault: "yes" }] }, "profileItemInvalid"],
					[
						{ type: "account-profile", version: 1, items: [{ type: "a", data: "x" }] },
						"accountDataHelper.accountDataNotObject"
					]
				];
				for (const type of ["identity", "Organization", "vc", "migration"]) {
					refusals.push([{ version: 1, items: [{ type, data: "x" }] }, "profileTypeNotAllowed"]);
				}
				for (const [profile, message] of refusals) {
					// The files are of the right type unless the case is about the type.
					const file =
						message.includes(".") || !Is.object<object>(profile)
							? profile
							: { type: "account-profile", ...profile };
					await expect(service.importProfile(file as never)).rejects.toMatchObject({
						name: "UnprocessableError",
						message: message.includes(".") ? message : `accountProfileHelper.${message}`
					});
				}
				await expect(service.exportProfile()).resolves.toMatchObject({
					items: [{ data: { line: "kept" } }]
				});
			});
		});

		it("should keep the existing profile when creating the imported items fails", async () => {
			await asAccount("account-1", async () => {
				await service.create("address", { line: "kept" });
				const set = accountData.set.bind(accountData);
				let writes = 0;
				vi.spyOn(accountData, "set").mockImplementation(async item => {
					writes++;
					if (writes === 2) {
						throw new Error("storage failed");
					}
					return set(item);
				});

				await expect(
					service.importProfile({
						type: "account-profile",
						version: 1,
						items: [
							{ type: "address", data: { line: "a" } },
							{ type: "address", data: { line: "b" } }
						]
					})
				).rejects.toMatchObject({
					name: "GeneralError",
					message: "accountProfileHelper.profileImportFailed"
				});
				vi.mocked(accountData.set).mockRestore();
				await expect(service.exportProfile()).resolves.toMatchObject({
					items: [{ data: { line: "kept" } }]
				});
			});
		});
	});

	it("should register and unregister the rate limit actions", async () => {
		const rate = {
			className: () => "rate",
			registerAction: vi.fn(),
			unregisterAction: vi.fn(),
			check: vi.fn()
		};
		ComponentFactory.register("authentication-rate", () => rate);
		service = new EntityStorageAuthenticationAccountService({
			config: { exportIdentityRateLimit: { maxAttempts: 2, windowMinutes: 5 } }
		});
		await service.start();
		await service.stop();

		expect(rate.registerAction.mock.calls).toEqual([
			["adopt-identity", { maxAttempts: 5, windowMinutes: 15 }],
			["export-identity", { maxAttempts: 2, windowMinutes: 5 }],
			["import-identity", { maxAttempts: 5, windowMinutes: 15 }],
			["export-profile", { maxAttempts: 10, windowMinutes: 15 }],
			["import-profile", { maxAttempts: 10, windowMinutes: 15 }]
		]);
		expect(rate.unregisterAction).toHaveBeenCalledTimes(5);
	});
});
