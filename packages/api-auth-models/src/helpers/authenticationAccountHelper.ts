// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { Coerce, Converter, Guards, Is } from "@3sixty/core";
import { Sha256 } from "@3sixty/crypto";
import type { IJsonLdNodeObject } from "@3sixty/data-json-ld";
import { nameof } from "@3sixty/nameof";
import { SchemaOrgContexts } from "@3sixty/standards-schema-org";
import { DidContexts, type IDidVerifiableCredential } from "@3sixty/standards-w3c-did";
import type { IAccountIdentityData } from "../models/IAccountIdentityData.js";
import type { IAccountOrganizationData } from "../models/IAccountOrganizationData.js";

/**
 * Helper methods for account data.
 */
export class AuthenticationAccountHelper {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<AuthenticationAccountHelper>();

	/**
	 * The schema.org property set to true on account data the account may not change, such as a
	 * profile owned by an authentication provider.
	 */
	public static readonly READ_ONLY_PROPERTY: string = "readonlyValue";

	/**
	 * Build the value of an identity item.
	 * @param identity The DID of the account.
	 * @returns The value.
	 */
	public static createIdentityData(identity: string): IAccountIdentityData {
		Guards.stringValue(AuthenticationAccountHelper.CLASS_NAME, nameof(identity), identity);
		return { "@context": DidContexts.Context, id: identity };
	}

	/**
	 * Get the DID from the value of an identity item.
	 * @param data The value of the item.
	 * @returns The DID, or undefined when the value is not an identity.
	 */
	public static getIdentity(data: unknown): string | undefined {
		return Is.object<Partial<IAccountIdentityData>>(data) &&
			data["@context"] === DidContexts.Context &&
			Is.stringValue(data.id)
			? data.id
			: undefined;
	}

	/**
	 * Build the value of an organization item.
	 * @param organization The DID of the organization.
	 * @returns The value.
	 */
	public static createOrganizationData(organization: string): IAccountOrganizationData {
		Guards.stringValue(AuthenticationAccountHelper.CLASS_NAME, nameof(organization), organization);
		return {
			"@context": SchemaOrgContexts.Context,
			"@type": "Organization",
			identifier: organization
		};
	}

	/**
	 * Get the DID from the value of an organization item.
	 * @param data The value of the item.
	 * @returns The DID, or undefined when the value is not an organization.
	 */
	public static getOrganization(data: unknown): string | undefined {
		return Is.object<Partial<IAccountOrganizationData>>(data) &&
			data["@context"] === SchemaOrgContexts.Context &&
			data["@type"] === "Organization" &&
			Is.stringValue(data.identifier)
			? data.identifier
			: undefined;
	}

	/**
	 * Get the credential from the value of a verifiable credential item, a JSON credential object with
	 * a context, the VerifiableCredential type, an issuer, a credential subject and a proof.
	 * @param data The value of the item.
	 * @returns The credential, or undefined when the value is not a JSON credential.
	 */
	public static getCredential(data: unknown): IDidVerifiableCredential | undefined {
		if (!Is.object<{ [key: string]: unknown }>(data)) {
			return undefined;
		}
		const context = data["@context"];
		const types = Is.array(data.type) ? data.type : [data.type];
		const subjects = Is.array(data.credentialSubject)
			? data.credentialSubject
			: [data.credentialSubject];
		const issuer = data.issuer;
		if (
			!(Is.stringValue(context) || Is.arrayValue(context)) ||
			!types.includes("VerifiableCredential") ||
			!(
				Is.stringValue(issuer) ||
				(Is.object<{ id?: unknown }>(issuer) && Is.stringValue(issuer.id))
			) ||
			subjects.length === 0 ||
			!subjects.every(subject => Is.object(subject)) ||
			!Is.object(data.proof)
		) {
			return undefined;
		}
		return data as unknown as IDidVerifiableCredential;
	}

	/**
	 * Get the DID of the issuer of a credential.
	 * @param credential The credential.
	 * @returns The issuer, or undefined when it has none.
	 */
	public static getCredentialIssuer(credential: IDidVerifiableCredential): string | undefined {
		const issuer = Is.stringValue(credential.issuer) ? credential.issuer : credential.issuer?.id;
		return Is.stringValue(issuer) ? issuer : undefined;
	}

	/**
	 * Get the subjects of a credential.
	 * @param credential The credential.
	 * @returns The subjects that are objects.
	 */
	public static getCredentialSubjects(credential: IDidVerifiableCredential): IJsonLdNodeObject[] {
		const subjects: unknown[] = Is.array(credential.credentialSubject)
			? credential.credentialSubject
			: [credential.credentialSubject];
		return subjects.filter(subject => Is.object<IJsonLdNodeObject>(subject));
	}

	/**
	 * Get the revocation index of a credential from the revocationBitmapIndex of its status, which
	 * may be written as a string.
	 * @param credential The credential.
	 * @returns The revocation index, or undefined when it has none.
	 */
	public static getCredentialRevocationIndex(
		credential: IDidVerifiableCredential
	): number | undefined {
		const statuses: unknown[] = Is.array(credential.credentialStatus)
			? credential.credentialStatus
			: [credential.credentialStatus];
		for (const status of statuses) {
			if (Is.object<{ revocationBitmapIndex?: unknown }>(status)) {
				const index = Coerce.integer(status.revocationBitmapIndex);
				if (Is.integer(index) && index >= 0) {
					return index;
				}
			}
		}
		return undefined;
	}

	/**
	 * Get the id of the account data item holding an identity. Storage only enforces uniqueness on
	 * the primary key, so the id is derived from the DID, hashed to keep it fixed length and URL safe,
	 * which also lets the item be found from the DID with a single get.
	 * @param identity The DID.
	 * @returns The unique identifier of the item.
	 */
	public static identityItemId(identity: string): string {
		Guards.stringValue(AuthenticationAccountHelper.CLASS_NAME, nameof(identity), identity);
		return `identity-${Converter.bytesToHex(Sha256.sum256(Converter.utf8ToBytes(identity)))}`;
	}

	/**
	 * Build the document an identity signs to prove it may be adopted by an account. The proof should
	 * be made with a verification method listed under the DID's authentication relationship, with the
	 * proof purpose authentication, and created just before it is sent as it is only accepted briefly.
	 * @param accountId The account adopting the identity.
	 * @param identity The DID being adopted.
	 * @param nodeIdentity The DID of the node the account is on, binds the proof to that node.
	 * @returns The document to create the proof for.
	 */
	public static identityProofDocument(
		accountId: string,
		identity: string,
		nodeIdentity?: string
	): IJsonLdNodeObject {
		Guards.stringValue(AuthenticationAccountHelper.CLASS_NAME, nameof(accountId), accountId);
		Guards.stringValue(AuthenticationAccountHelper.CLASS_NAME, nameof(identity), identity);

		const document: IJsonLdNodeObject = {
			"@context": SchemaOrgContexts.Context,
			"@type": "AuthorizeAction",
			agent: identity,
			recipient: accountId
		};
		// Only added when given, so the document without a node is unchanged.
		if (Is.stringValue(nodeIdentity)) {
			document.instrument = nodeIdentity;
		}
		return document;
	}

	/**
	 * Build the document an identity signs to prove it may be registered as an organization on a node.
	 * @param identity The DID of the organization.
	 * @param nodeIdentity The DID of the node the organization is registered on.
	 * @returns The document to create the proof for.
	 */
	public static organizationProofDocument(
		identity: string,
		nodeIdentity?: string
	): IJsonLdNodeObject {
		Guards.stringValue(AuthenticationAccountHelper.CLASS_NAME, nameof(identity), identity);

		const document: IJsonLdNodeObject = {
			"@context": SchemaOrgContexts.Context,
			"@type": "RegisterAction",
			agent: identity,
			object: "Organization"
		};
		if (Is.stringValue(nodeIdentity)) {
			document.recipient = nodeIdentity;
		}
		return document;
	}

	/**
	 * Mark account data as read only, so the account may not change it.
	 * @param data The object to mark.
	 * @returns A copy of the object with the read only property set.
	 */
	public static markReadOnly<T extends { [key: string]: unknown }>(data: T): T {
		return { ...data, [AuthenticationAccountHelper.READ_ONLY_PROPERTY]: true };
	}

	/**
	 * Check whether account data is read only.
	 * @param data The value of the account data.
	 * @returns True when the value is an object with the read only property set to true.
	 */
	public static isReadOnly(data: unknown): boolean {
		return (
			Is.object<{ [key: string]: unknown }>(data) &&
			data[AuthenticationAccountHelper.READ_ONLY_PROPERTY] === true
		);
	}
}
