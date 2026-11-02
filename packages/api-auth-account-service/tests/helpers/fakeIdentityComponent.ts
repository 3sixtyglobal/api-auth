// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { ConflictError, GeneralError, NotFoundError, ObjectHelper } from "@3sixty/core";
import type { IIdentityComponent, IIdentityExport } from "@3sixty/identity-models";
import { membershipCredential, verifyTestCredential } from "./accountDataValues.js";

/**
 * An identity component that keeps the identities the node holds in memory, so exports, imports
 * and removals can be followed.
 */
export interface IFakeIdentityComponent extends IIdentityComponent {
	/**
	 * The identities the node holds, by DID.
	 */
	held: Map<string, IIdentityExport>;

	/**
	 * The revoked credentials, as issuer:index.
	 */
	revoked: Set<string>;
}

/**
 * Create the fake identity component.
 * @returns The component.
 */
export function createFakeIdentityComponent(): IFakeIdentityComponent {
	const held = new Map<string, IIdentityExport>();
	const revoked = new Set<string>();
	let counter = 0;

	const notHeld = (operation: string, identity: string): GeneralError =>
		new GeneralError(
			"identityService",
			operation,
			{ identity },
			new NotFoundError("entityStorageIdentityConnector", "documentNotFound", identity)
		);

	const component = {
		className: () => "identity",
		held,
		revoked,
		identityCreate: vi.fn(
			async (namespace?: string, controller?: string, options?: { selfControlled?: boolean }) => {
				counter++;
				const id = `did:entity-storage:0x${counter.toString(16).padStart(4, "0")}`;
				held.set(id, {
					version: 1,
					namespace: "entity-storage",
					selfControlled: options?.selfControlled ?? false,
					document: { "@context": "https://www.w3.org/ns/did/v1", id },
					documentSignature: "base64-signature",
					keys: [
						{
							id: "did",
							type: "Ed25519",
							privateKey: "base64-private-key",
							publicKey: "base64-public-key"
						}
					]
				});
				return { id };
			}
		),
		identityExport: vi.fn(async (identity: string) => {
			const exported = held.get(identity);
			if (exported === undefined) {
				throw notHeld("identityExportFailed", identity);
			}
			return ObjectHelper.clone(exported);
		}),
		identityImport: vi.fn(async (exported: IIdentityExport) => {
			const identity = exported.document.id;
			if (held.has(identity)) {
				throw new GeneralError(
					"identityService",
					"identityImportFailed",
					undefined,
					new ConflictError("entityStorageIdentityConnector", "documentAlreadyExists", identity)
				);
			}
			held.set(identity, ObjectHelper.clone(exported));
			return exported.document;
		}),
		identityRemove: vi.fn(async (identity: string) => {
			if (!held.delete(identity)) {
				throw notHeld("identityRemoveFailed", identity);
			}
		}),
		verificationMethodCreate: vi.fn(async (identity: string, type: string, id: string) => ({
			id: `${identity}#${id}`
		})),
		proofVerify: vi.fn().mockResolvedValue(true),
		verifiableCredentialCreate: vi.fn(
			async (
				verificationMethodId: string,
				id: unknown,
				subject: unknown,
				options?: { revocationIndex?: number }
			) => ({
				verifiableCredential: membershipCredential(
					verificationMethodId.split("#")[0],
					subject,
					options?.revocationIndex
				),
				jwt: "unused.credential.jwt"
			})
		),
		verifiableCredentialVerify: vi.fn(async (credential: unknown) =>
			verifyTestCredential(credential, revoked)
		),
		verifiableCredentialRevoke: vi.fn(async (issuer: string, index: number) => {
			revoked.add(`${issuer}:${index}`);
		})
	};
	return component as unknown as IFakeIdentityComponent;
}
