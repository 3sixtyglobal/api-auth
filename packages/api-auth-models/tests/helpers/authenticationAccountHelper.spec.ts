// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { MimeTypes } from "@3sixty/web";
import { AuthenticationAccountHelper } from "../../src/helpers/authenticationAccountHelper.js";

describe("AuthenticationAccountHelper", () => {
	it("should bind the identity proof document to the account and the identity", () => {
		expect(AuthenticationAccountHelper.identityProofDocument("account-1", "did:example:1")).toEqual(
			{
				"@context": "https://schema.org",
				"@type": "AuthorizeAction",
				agent: "did:example:1",
				recipient: "account-1"
			}
		);
	});

	it("should bind the identity proof document to the node when given", () => {
		expect(
			AuthenticationAccountHelper.identityProofDocument(
				"account-1",
				"did:example:1",
				"did:example:node"
			)
		).toStrictEqual({
			"@context": "https://schema.org",
			"@type": "AuthorizeAction",
			agent: "did:example:1",
			recipient: "account-1",
			instrument: "did:example:node"
		});
		expect(
			Object.keys(AuthenticationAccountHelper.identityProofDocument("account-1", "did:example:1"))
		).not.toContain("instrument");
	});

	it("should bind the organization proof document to the identity and the node", () => {
		expect(
			AuthenticationAccountHelper.organizationProofDocument("did:example:org", "did:example:node")
		).toStrictEqual({
			"@context": "https://schema.org",
			"@type": "RegisterAction",
			agent: "did:example:org",
			object: "Organization",
			recipient: "did:example:node"
		});
		expect(() => AuthenticationAccountHelper.organizationProofDocument("")).toThrow();
	});

	it("should require an account and an identity", () => {
		expect(() => AuthenticationAccountHelper.identityProofDocument("", "did:example:1")).toThrow();
		expect(() => AuthenticationAccountHelper.identityProofDocument("account-1", "")).toThrow();
	});

	it("should derive a fixed length identity item id from the DID", () => {
		const id = AuthenticationAccountHelper.identityItemId("did:example:1");
		expect(id).toMatch(/^identity-[\da-f]{64}$/);
		expect(AuthenticationAccountHelper.identityItemId("did:example:1")).toBe(id);
		expect(AuthenticationAccountHelper.identityItemId("did:example:2")).not.toBe(id);
		expect(() => AuthenticationAccountHelper.identityItemId("")).toThrow();
	});

	it("should mark and detect read only account data", () => {
		const data = AuthenticationAccountHelper.markReadOnly({ "@type": "Person", name: "Alice" });
		expect(data).toEqual({ "@type": "Person", name: "Alice", readonlyValue: true });
		expect(AuthenticationAccountHelper.isReadOnly(data)).toBe(true);
		expect(AuthenticationAccountHelper.isReadOnly({ readonlyValue: "true" })).toBe(false);
		expect(AuthenticationAccountHelper.isReadOnly("did:example:1")).toBe(false);
		expect(AuthenticationAccountHelper.isReadOnly(undefined)).toBe(false);
	});

	it("should build and read the value of an identity item", () => {
		const data = AuthenticationAccountHelper.createIdentityData("did:example:1");
		expect(data).toStrictEqual({ "@context": "https://www.w3.org/ns/did/v1", id: "did:example:1" });
		expect(AuthenticationAccountHelper.getIdentity(data)).toBe("did:example:1");
	});

	it("should not read an identity from another value", () => {
		expect(AuthenticationAccountHelper.getIdentity("did:example:1")).toBeUndefined();
		expect(AuthenticationAccountHelper.getIdentity({ id: "did:example:1" })).toBeUndefined();
		expect(
			AuthenticationAccountHelper.getIdentity({ "@context": "https://www.w3.org/ns/did/v1" })
		).toBeUndefined();
	});

	it("should build and read the value of an organization item", () => {
		const data = AuthenticationAccountHelper.createOrganizationData("did:example:org");
		expect(data).toStrictEqual({
			"@context": "https://schema.org",
			"@type": "Organization",
			identifier: "did:example:org"
		});
		expect(AuthenticationAccountHelper.getOrganization(data)).toBe("did:example:org");
	});

	it("should not read an organization from another value", () => {
		expect(AuthenticationAccountHelper.getOrganization("did:example:org")).toBeUndefined();
		expect(
			AuthenticationAccountHelper.getOrganization({
				"@context": "https://schema.org",
				"@type": "Person",
				identifier: "did:example:org"
			})
		).toBeUndefined();
	});

	const credential = {
		"@context": ["https://www.w3.org/2018/credentials/v1", "https://schema.org"],
		type: ["VerifiableCredential", "OrganizationMembershipCredential"],
		issuer: "did:example:org",
		credentialSubject: { id: "did:example:1", memberOf: { id: "did:example:org" } },
		credentialStatus: {
			id: "did:example:org#revocation",
			type: "RevocationBitmap2022",
			revocationBitmapIndex: "5"
		},
		proof: { type: "DataIntegrityProof", proofValue: "z-signature" }
	};

	it("should return a JSON credential as it is", () => {
		expect(AuthenticationAccountHelper.getCredential(credential)).toBe(credential);
		expect(
			AuthenticationAccountHelper.getCredential({
				...credential,
				"@context": "https://www.w3.org/ns/credentials/v2",
				type: "VerifiableCredential",
				issuer: { id: "did:example:org" },
				credentialSubject: [{ id: "did:example:1" }]
			})
		).toBeDefined();
	});

	it("should not read a JWT, an enveloped credential or a malformed credential", () => {
		const { proof, ...withoutProof } = credential;
		expect(proof).toBeDefined();
		for (const value of [
			"a.b.c",
			undefined,
			[credential],
			{
				"@context": "https://www.w3.org/ns/credentials/v2",
				type: "EnvelopedVerifiableCredential",
				id: `data:${MimeTypes.VerifiableCredentialJwt},a.b.c`
			},
			withoutProof,
			{ ...credential, proof: "z-signature" },
			{ ...credential, "@context": undefined },
			{ ...credential, "@context": [] },
			{ ...credential, type: ["OrganizationMembershipCredential"] },
			{ ...credential, issuer: undefined },
			{ ...credential, issuer: { name: "org" } },
			{ ...credential, credentialSubject: undefined },
			{ ...credential, credentialSubject: [] },
			{ ...credential, credentialSubject: ["did:example:1"] }
		]) {
			expect(AuthenticationAccountHelper.getCredential(value)).toBeUndefined();
		}
	});

	it("should read the issuer, subjects and revocation index of a credential", () => {
		const read = AuthenticationAccountHelper.getCredential(credential);
		if (!read) {
			throw new Error("not a credential");
		}
		expect(AuthenticationAccountHelper.getCredentialIssuer(read)).toBe("did:example:org");
		expect(
			AuthenticationAccountHelper.getCredentialIssuer({ ...read, issuer: { id: "did:example:2" } })
		).toBe("did:example:2");
		expect(AuthenticationAccountHelper.getCredentialSubjects(read)).toEqual([
			{ id: "did:example:1", memberOf: { id: "did:example:org" } }
		]);
		// The connector writes the index as a string.
		expect(AuthenticationAccountHelper.getCredentialRevocationIndex(read)).toBe(5);
		expect(
			AuthenticationAccountHelper.getCredentialRevocationIndex({
				...read,
				credentialStatus: [{ id: "s", type: "t", revocationBitmapIndex: 3 }]
			})
		).toBe(3);
		for (const credentialStatus of [
			undefined,
			{ id: "s", type: "t" },
			{ id: "s", type: "t", revocationBitmapIndex: "-1" },
			{ id: "s", type: "t", revocationBitmapIndex: "x" }
		]) {
			expect(
				AuthenticationAccountHelper.getCredentialRevocationIndex({ ...read, credentialStatus })
			).toBeUndefined();
		}
	});
});
