// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { AuthenticationAccountHelper } from "@3sixty/api-auth-models";
import { ContextIdKeys, ContextIdStore } from "@3sixty/context";
import { Is, UnauthorizedError } from "@3sixty/core";
import type { IIdentityComponent } from "@3sixty/identity-models";
import { nameof } from "@3sixty/nameof";
import type { IProof } from "@3sixty/standards-w3c-did";

/**
 * Helper class for verifying the proof that a caller owns a DID bound to an account or registered
 * as an organization.
 */
export class IdentityProofHelper {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<IdentityProofHelper>();

	/**
	 * The default time a proof may be used for after it was created, in seconds.
	 */
	public static readonly DEFAULT_MAX_AGE_SECONDS: number = 300;

	/**
	 * How far a proof may be created in the future, to allow for clock differences, in milliseconds.
	 * @internal
	 */
	private static readonly _CLOCK_SKEW_MS: number = 30000;

	/**
	 * Verify the proof that the caller owns the DID being bound to the account. The proof must be
	 * made with a verification method of the DID over the identity proof document, with or without
	 * the node, and created recently.
	 * @param identityComponent The identity component.
	 * @param accountId The account the identity is bound to.
	 * @param identity The DID being bound.
	 * @param proof The proof by the DID over the identity proof document.
	 * @param maxAgeSeconds How long the proof may be used for after it was created.
	 * @returns A promise that resolves when the proof has been verified.
	 * @throws UnauthorizedError when the proof is missing, is not by the DID, has expired or does not verify.
	 */
	public static async verify(
		identityComponent: IIdentityComponent,
		accountId: string,
		identity: string,
		proof: IProof | undefined,
		maxAgeSeconds: number
	): Promise<void> {
		const nodeIdentity = await IdentityProofHelper.nodeIdentity();
		const documents = [
			AuthenticationAccountHelper.identityProofDocument(accountId, identity, nodeIdentity)
		];
		if (Is.stringValue(nodeIdentity)) {
			documents.push(AuthenticationAccountHelper.identityProofDocument(accountId, identity));
		}
		await IdentityProofHelper.verifyDocuments(
			identityComponent,
			identity,
			proof,
			documents,
			maxAgeSeconds
		);
	}

	/**
	 * Verify the proof that the caller owns the DID being registered as an organization, made over
	 * the organization proof document bound to the node, otherwise as for an account identity.
	 * @param identityComponent The identity component.
	 * @param identity The DID being registered.
	 * @param proof The proof by the DID over the organization proof document.
	 * @param maxAgeSeconds How long the proof may be used for after it was created.
	 * @returns A promise that resolves when the proof has been verified.
	 * @throws UnauthorizedError when the proof is missing, is not by the DID, has expired or does not verify.
	 */
	public static async verifyOrganization(
		identityComponent: IIdentityComponent,
		identity: string,
		proof: IProof | undefined,
		maxAgeSeconds: number
	): Promise<void> {
		await IdentityProofHelper.verifyDocuments(
			identityComponent,
			identity,
			proof,
			[
				AuthenticationAccountHelper.organizationProofDocument(
					identity,
					await IdentityProofHelper.nodeIdentity()
				)
			],
			maxAgeSeconds
		);
	}

	/**
	 * Verify a proof by a DID over one of the documents.
	 * @param identityComponent The identity component.
	 * @param identity The DID.
	 * @param proof The proof.
	 * @param documents The documents the proof may be over.
	 * @param maxAgeSeconds How long the proof may be used for after it was created.
	 * @returns A promise that resolves when the proof has been verified.
	 * @internal
	 */
	private static async verifyDocuments(
		identityComponent: IIdentityComponent,
		identity: string,
		proof: IProof | undefined,
		documents: ReturnType<typeof AuthenticationAccountHelper.identityProofDocument>[],
		maxAgeSeconds: number
	): Promise<void> {
		if (
			!Is.object<IProof>(proof) ||
			!Is.stringValue(proof.verificationMethod) ||
			!proof.verificationMethod.startsWith(`${identity}#`)
		) {
			throw new UnauthorizedError(IdentityProofHelper.CLASS_NAME, "identityProofInvalid");
		}

		// A short lived proof limits how long a leaked proof can be replayed.
		const created = Is.stringValue(proof.created) ? Date.parse(proof.created) : Number.NaN;
		const now = Date.now();
		if (
			Number.isNaN(created) ||
			created > now + IdentityProofHelper._CLOCK_SKEW_MS ||
			now - created > maxAgeSeconds * 1000
		) {
			throw new UnauthorizedError(IdentityProofHelper.CLASS_NAME, "identityProofExpired", {
				maxAgeSeconds
			});
		}

		for (const document of documents) {
			let verified: boolean;
			try {
				verified = await identityComponent.proofVerify(document, proof);
			} catch (error) {
				throw new UnauthorizedError(
					IdentityProofHelper.CLASS_NAME,
					"identityProofInvalid",
					undefined,
					error
				);
			}
			if (verified) {
				return;
			}
		}
		throw new UnauthorizedError(IdentityProofHelper.CLASS_NAME, "identityProofInvalid");
	}

	/**
	 * Get the DID of the node from the request context.
	 * @returns The DID, or undefined when it is not set.
	 * @internal
	 */
	private static async nodeIdentity(): Promise<string | undefined> {
		const contextIds = await ContextIdStore.getContextIds();
		return contextIds?.[ContextIdKeys.Node];
	}
}
