// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import {
	AuthenticationAccountHelper,
	type IAccountIdentityData,
	type IAccountOrganizationData
} from "@3sixty/api-auth-models";
import { Is } from "@3sixty/core";
import type { IDidVerifiableCredential } from "@3sixty/standards-w3c-did";

/**
 * Build the value of an identity item.
 * @param identity The DID.
 * @returns The value.
 */
export function identityData(identity: string): IAccountIdentityData {
	return AuthenticationAccountHelper.createIdentityData(identity);
}

/**
 * Build the value of an organization item.
 * @param organization The DID.
 * @returns The value.
 */
export function organizationData(organization: string): IAccountOrganizationData {
	return AuthenticationAccountHelper.createOrganizationData(organization);
}

/**
 * Build a JSON credential with an embedded proof, as the identity component issues.
 * @param id The id of the credential.
 * @returns The credential.
 */
export function credentialData(id: string): IDidVerifiableCredential {
	return {
		"@context": "https://www.w3.org/ns/credentials/v2",
		id,
		type: ["VerifiableCredential"],
		issuer: "did:example:issuer",
		credentialSubject: { id: "did:example:subject" },
		proof: {
			type: "DataIntegrityProof",
			cryptosuite: "eddsa-jcs-2022",
			created: "2026-01-12T09:05:23.123Z",
			verificationMethod: "did:example:issuer#key-1",
			proofPurpose: "assertionMethod",
			proofValue: "z-signature"
		}
	};
}

/**
 * Build a JSON membership credential with an embedded proof, as the identity component issues.
 * The test identity components verify it unless its proof value is "forged", and treat a proof
 * value of "revoked" as revoked.
 * @param issuer The issuer.
 * @param subject The credential subject.
 * @param revocationIndex The revocation index, when the credential can be revoked.
 * @param proofValue The proof value.
 * @returns The credential.
 */
export function membershipCredential(
	issuer: unknown,
	subject: unknown,
	revocationIndex?: number,
	proofValue: string = "z-signature"
): IDidVerifiableCredential {
	const issuerId = String(Is.object<{ id?: unknown }>(issuer) ? issuer.id : issuer);
	const credential = {
		"@context": ["https://www.w3.org/2018/credentials/v1", "https://schema.org"],
		type: ["VerifiableCredential", "OrganizationMembershipCredential"],
		issuer,
		credentialSubject: subject,
		issuanceDate: "2026-01-12T09:05:23.123Z",
		proof: {
			type: "DataIntegrityProof",
			cryptosuite: "eddsa-jcs-2022",
			created: "2026-01-12T09:05:23.123Z",
			verificationMethod: `${issuerId}#organization-assertion`,
			proofPurpose: "assertionMethod",
			proofValue
		}
	} as IDidVerifiableCredential;
	// The status is only present when the credential can be revoked, as stored.
	if (Is.integer(revocationIndex)) {
		credential.credentialStatus = {
			id: `${issuerId}#revocation`,
			type: "RevocationBitmap2022",
			revocationBitmapIndex: revocationIndex.toString()
		};
	}
	return credential;
}

/**
 * Verify a credential as the test identity components do, only a JSON credential verifies.
 * @param credential The credential to verify.
 * @param revoked The revoked credentials, as issuer:index.
 * @returns The verification result.
 * @throws Error when the credential is not an object or its proof is forged.
 */
export function verifyTestCredential(
	credential: unknown,
	revoked?: Set<string>
): { revoked: boolean; verifiableCredential: IDidVerifiableCredential } {
	if (!Is.object<IDidVerifiableCredential>(credential)) {
		throw new Error("not a credential object");
	}
	const proofValue = Is.object<{ proofValue?: unknown }>(credential.proof)
		? credential.proof.proofValue
		: undefined;
	if (proofValue === "forged") {
		throw new Error("invalid signature");
	}
	const issuer = AuthenticationAccountHelper.getCredentialIssuer(credential);
	const index = AuthenticationAccountHelper.getCredentialRevocationIndex(credential);
	return {
		revoked: proofValue === "revoked" || (revoked?.has(`${issuer}:${index}`) ?? false),
		verifiableCredential: credential
	};
}
