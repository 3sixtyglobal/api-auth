// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { ContextIdKeys, ContextIdStore } from "@3sixty/context";
import { UnprocessableError } from "@3sixty/core";
import { MemoryEntityStorageConnector } from "@3sixty/entity-storage-connector-memory";
import type { IIdentityComponent } from "@3sixty/identity-models";
import { nameof } from "@3sixty/nameof";
import type { AccountData } from "../../src/entities/accountData.js";
import type { Organization } from "../../src/entities/organization.js";
import { initSchema } from "../../src/schema.js";
import { AccountDataHelper } from "../../src/utils/accountDataHelper.js";
import { OrganizationHelper } from "../../src/utils/organizationHelper.js";
import { OrganizationMembershipHelper } from "../../src/utils/organizationMembershipHelper.js";
import {
	credentialData,
	membershipCredential,
	organizationData,
	verifyTestCredential
} from "../helpers/accountDataValues.js";

initSchema();

describe("OrganizationMembershipHelper", () => {
	let storage: MemoryEntityStorageConnector<AccountData>;
	let organizations: MemoryEntityStorageConnector<Organization>;
	let identityComponent: IIdentityComponent;

	beforeEach(async () => {
		storage = new MemoryEntityStorageConnector<AccountData>({
			entitySchema: nameof<AccountData>(),
			config: { storageKey: "account-data-membership" }
		});
		organizations = new MemoryEntityStorageConnector<Organization>({
			entitySchema: nameof<Organization>(),
			config: { storageKey: "organization-membership" }
		});
		identityComponent = {
			verifiableCredentialCreate: vi
				.fn()
				.mockImplementation(
					async (verificationMethodId: string, id: unknown, subject: unknown) => ({
						verifiableCredential: membershipCredential(verificationMethodId.split("#")[0], subject),
						jwt: "unused.credential.jwt"
					})
				),
			verifiableCredentialVerify: vi
				.fn()
				.mockImplementation(async (credential: unknown) => verifyTestCredential(credential))
		} as unknown as IIdentityComponent;
		await AccountDataHelper.createIdentity(storage, "account-1", "did:example:user");
	});

	afterEach(async () => {
		await storage.teardown();
		await organizations.teardown();
	});

	it("should add an account to an organization directly with a membership credential", async () => {
		await OrganizationMembershipHelper.join(
			storage,
			organizations,
			identityComponent,
			"trust-assertion",
			"account-1",
			"did:example:org-1"
		);
		await OrganizationMembershipHelper.join(
			storage,
			organizations,
			identityComponent,
			"trust-assertion",
			"account-1",
			"did:example:org-2"
		);

		expect(vi.mocked(identityComponent.verifiableCredentialCreate).mock.calls[0]).toMatchObject([
			"did:example:org-1#trust-assertion",
			undefined,
			{ id: "did:example:user", memberOf: { id: "did:example:org-1" } },
			// The credential says what it is for, the membership is still recognised by its issuer.
			{ types: [OrganizationMembershipHelper.CREDENTIAL_TYPE] },
			"did:example:org-1"
		]);
		expect(OrganizationMembershipHelper.CREDENTIAL_TYPE).toBe("OrganizationMembershipCredential");
		const memberships = await AccountDataHelper.query(storage, "account-1", "organization");
		expect(memberships.entities.map(e => [e.data, e.isDefault])).toEqual([
			[organizationData("did:example:org-1"), true],
			[organizationData("did:example:org-2"), false]
		]);
		const credentials = await AccountDataHelper.query(storage, "account-1", "vc");
		expect(credentials.entities).toHaveLength(2);
		// The JSON credential is stored with its embedded proof, not the JWT.
		const issued = await vi.mocked(identityComponent.verifiableCredentialCreate).mock.results[0]
			.value;
		expect(credentials.entities[0].data).toEqual(issued.verifiableCredential);
		expect(credentials.entities[0].data).toMatchObject({
			issuer: "did:example:org-1",
			proof: { type: "DataIntegrityProof" }
		});
	});

	it("should verify a membership with the JSON credential object", async () => {
		const credential = membershipCredential("did:example:org-1", {
			id: "did:example:user",
			memberOf: { id: "did:example:org-1" }
		});
		await AccountDataHelper.create(storage, "account-1", "vc", credential);

		await expect(
			OrganizationMembershipHelper.hasCredential(
				storage,
				identityComponent,
				"account-1",
				"did:example:org-1"
			)
		).resolves.toBe(true);
		expect(identityComponent.verifiableCredentialVerify).toHaveBeenCalledWith(credential);
	});

	it("should ignore stored credentials that are not JSON credential objects", async () => {
		const now = new Date().toISOString();
		for (const [id, data] of [
			["vc-jwt", "eyJhbGciOiJFZERTQSJ9.eyJpc3MiOiJkaWQ6ZXhhbXBsZTpvcmctMSJ9.c2ln"],
			[
				"vc-enveloped",
				{
					"@context": "https://www.w3.org/ns/credentials/v2",
					type: "EnvelopedVerifiableCredential",
					id: "data:application/vc+jwt,a.b.c"
				}
			]
		] as const) {
			await storage.set({
				id,
				accountId: "account-1",
				type: "vc",
				data,
				isDefault: false,
				dateCreated: now,
				dateModified: now
			});
		}

		await expect(
			OrganizationMembershipHelper.loadCredentials(storage, "account-1")
		).resolves.toEqual([]);
		await expect(
			OrganizationMembershipHelper.hasCredential(
				storage,
				identityComponent,
				"account-1",
				"did:example:org-1"
			)
		).resolves.toBe(false);
		expect(identityComponent.verifiableCredentialVerify).not.toHaveBeenCalled();
	});

	it("should leave an existing membership alone, other than making it the default", async () => {
		await OrganizationMembershipHelper.join(
			storage,
			organizations,
			identityComponent,
			"trust-assertion",
			"account-1",
			"did:example:org-1"
		);
		await OrganizationMembershipHelper.join(
			storage,
			organizations,
			identityComponent,
			"trust-assertion",
			"account-1",
			"did:example:org-2"
		);
		await OrganizationMembershipHelper.join(
			storage,
			organizations,
			identityComponent,
			"trust-assertion",
			"account-1",
			"did:example:org-2",
			true
		);

		expect(identityComponent.verifiableCredentialCreate).toHaveBeenCalledTimes(2);
		const organization = await AccountDataHelper.getDefault(storage, "account-1", "organization");
		expect(organization?.data).toEqual(organizationData("did:example:org-2"));
	});

	it("should require the account to have an identity", async () => {
		await expect(
			OrganizationMembershipHelper.join(
				storage,
				organizations,
				identityComponent,
				"trust-assertion",
				"account-2",
				"did:example:org-1"
			)
		).rejects.toMatchObject({
			name: UnprocessableError.CLASS_NAME,
			message: "organizationMembershipHelper.identityRequired"
		});
	});

	it("should issue the credential when an interrupted join left only the organization", async () => {
		await AccountDataHelper.create(
			storage,
			"account-1",
			"organization",
			organizationData("did:example:org-1"),
			true
		);
		await AccountDataHelper.create(
			storage,
			"account-1",
			"vc",
			membershipCredential("did:example:org-1", { name: "other" })
		);

		await OrganizationMembershipHelper.join(
			storage,
			organizations,
			identityComponent,
			"trust-assertion",
			"account-1",
			"did:example:org-1"
		);
		await OrganizationMembershipHelper.join(
			storage,
			organizations,
			identityComponent,
			"trust-assertion",
			"account-1",
			"did:example:org-1"
		);

		expect(identityComponent.verifiableCredentialCreate).toHaveBeenCalledTimes(1);
		const memberships = await AccountDataHelper.query(storage, "account-1", "organization");
		expect(memberships.entities).toHaveLength(1);
		await expect(
			OrganizationMembershipHelper.hasCredential(
				storage,
				identityComponent,
				"account-1",
				"did:example:org-1"
			)
		).resolves.toBe(true);
	});

	it("should store the organization without issuing again when the credential exists", async () => {
		await AccountDataHelper.create(
			storage,
			"account-1",
			"vc",
			membershipCredential({ id: "did:example:org-1" }, [
				{ id: "did:example:user", memberOf: [{ id: "did:example:org-1" }] }
			])
		);

		await OrganizationMembershipHelper.join(
			storage,
			organizations,
			identityComponent,
			"trust-assertion",
			"account-1",
			"did:example:org-1"
		);

		expect(identityComponent.verifiableCredentialCreate).not.toHaveBeenCalled();
		const organization = await AccountDataHelper.getDefault(storage, "account-1", "organization");
		expect(organization?.data).toEqual(organizationData("did:example:org-1"));
		const credentials = await AccountDataHelper.query(storage, "account-1", "vc");
		expect(credentials.entities).toHaveLength(1);
	});

	it("should only match a credential for the same organization", async () => {
		await AccountDataHelper.create(
			storage,
			"account-1",
			"vc",
			membershipCredential("did:example:org-2", {
				id: "did:example:user",
				memberOf: { id: "did:example:org-2" }
			})
		);
		await AccountDataHelper.create(storage, "account-1", "vc", credentialData("vc-1"));

		await expect(
			OrganizationMembershipHelper.hasCredential(
				storage,
				identityComponent,
				"account-1",
				"did:example:org-1"
			)
		).resolves.toBe(false);
		await expect(
			OrganizationMembershipHelper.hasCredential(
				storage,
				identityComponent,
				"account-1",
				"did:example:org-2"
			)
		).resolves.toBe(true);
	});

	it("should only verify the credentials that claim the organization as their issuer", async () => {
		const subject = { id: "did:example:user", memberOf: { id: "did:example:org-1" } };
		await AccountDataHelper.create(storage, "account-1", "vc", credentialData("vc-1"));
		await AccountDataHelper.create(
			storage,
			"account-1",
			"vc",
			membershipCredential("did:example:org-2", subject)
		);
		await AccountDataHelper.create(
			storage,
			"account-1",
			"vc",
			membershipCredential({ id: "did:example:org-1" }, subject)
		);

		await expect(
			OrganizationMembershipHelper.hasCredential(
				storage,
				identityComponent,
				"account-1",
				"did:example:org-1"
			)
		).resolves.toBe(true);
		expect(identityComponent.verifiableCredentialVerify).toHaveBeenCalledTimes(1);
	});

	it("should use the account data given rather than reading it again", async () => {
		const querySpy = vi.spyOn(storage, "query");

		await expect(
			OrganizationMembershipHelper.join(
				storage,
				organizations,
				identityComponent,
				"trust-assertion",
				"account-1",
				"did:example:org-1",
				false,
				{ identity: "did:example:user", organizations: [], credentials: [] }
			)
		).resolves.toEqual(expect.any(String));
		expect(querySpy).not.toHaveBeenCalled();
		await expect(
			OrganizationMembershipHelper.hasCredential(
				storage,
				identityComponent,
				"account-1",
				"did:example:org-1",
				{ identity: "did:example:user", credentials: [] }
			)
		).resolves.toBe(false);
		expect(querySpy).not.toHaveBeenCalled();
	});

	it("should ignore credentials that are forged, revoked, from another issuer or for another identity", async () => {
		const subject = { id: "did:example:user", memberOf: { id: "did:example:org-1" } };
		for (const credential of [
			membershipCredential("did:example:org-1", subject, undefined, "forged"),
			membershipCredential("did:example:org-1", subject, undefined, "revoked"),
			membershipCredential("did:example:mallory", subject),
			membershipCredential("did:example:org-1", { ...subject, id: "did:example:other" }),
			membershipCredential("did:example:org-1", { memberOf: { id: "did:example:org-1" } })
		]) {
			await AccountDataHelper.create(storage, "account-1", "vc", credential);
		}

		await expect(
			OrganizationMembershipHelper.hasCredential(
				storage,
				identityComponent,
				"account-1",
				"did:example:org-1"
			)
		).resolves.toBe(false);
		await expect(
			OrganizationMembershipHelper.hasCredential(
				storage,
				identityComponent,
				"account-2",
				"did:example:org-1"
			)
		).resolves.toBe(false);

		await OrganizationMembershipHelper.join(
			storage,
			organizations,
			identityComponent,
			"trust-assertion",
			"account-1",
			"did:example:org-1"
		);
		expect(identityComponent.verifiableCredentialCreate).toHaveBeenCalledTimes(1);
	});

	it("should require an identity to complete a membership without a credential", async () => {
		await AccountDataHelper.create(
			storage,
			"account-2",
			"organization",
			organizationData("did:example:org-1"),
			true
		);

		await expect(
			OrganizationMembershipHelper.join(
				storage,
				organizations,
				identityComponent,
				"trust-assertion",
				"account-2",
				"did:example:org-1"
			)
		).rejects.toMatchObject({
			name: UnprocessableError.CLASS_NAME,
			message: "organizationMembershipHelper.identityRequired"
		});
	});

	describe("revocation", () => {
		beforeEach(async () => {
			await OrganizationHelper.register(organizations, "did:example:org-1");
			identityComponent.verifiableCredentialRevoke = vi.fn();
		});

		it("should issue the credential of a registered organization with an index it records", async () => {
			await AccountDataHelper.createIdentity(storage, "account-2", "did:example:user-2");
			const id1 = await OrganizationMembershipHelper.join(
				storage,
				organizations,
				identityComponent,
				"trust-assertion",
				"account-1",
				"did:example:org-1"
			);
			const id2 = await OrganizationMembershipHelper.join(
				storage,
				organizations,
				identityComponent,
				"trust-assertion",
				"account-2",
				"did:example:org-1"
			);

			expect(
				vi.mocked(identityComponent.verifiableCredentialCreate).mock.calls.map(call => call[3])
			).toMatchObject([{ revocationIndex: 0 }, { revocationIndex: 1 }]);
			await expect(AccountDataHelper.getRevocationIndex(storage, id1)).resolves.toBe(0);
			await expect(AccountDataHelper.getRevocationIndex(storage, id2)).resolves.toBe(1);
			// The index is never returned with the item, and survives the item being updated.
			const item = await AccountDataHelper.get(storage, id1);
			expect(item).not.toHaveProperty("revocationIndex");
			await AccountDataHelper.updateItem(storage, item, item.data, true);
			await expect(AccountDataHelper.getRevocationIndex(storage, id1)).resolves.toBe(0);
		});

		it("should record the index on a pending membership and revoke the one it replaces", async () => {
			const id = await AccountDataHelper.create(
				storage,
				"account-1",
				"organization",
				organizationData("did:example:org-1"),
				true,
				undefined,
				{ revocationIndex: 7 }
			);
			await ContextIdStore.run({ [ContextIdKeys.Node]: "did:example:node" }, async () =>
				OrganizationMembershipHelper.join(
					storage,
					organizations,
					identityComponent,
					"trust-assertion",
					"account-1",
					"did:example:org-1"
				)
			);

			await expect(AccountDataHelper.getRevocationIndex(storage, id)).resolves.toBe(0);
			expect(identityComponent.verifiableCredentialRevoke).toHaveBeenCalledWith(
				"did:example:org-1",
				7,
				"did:example:node"
			);
		});
	});
});
