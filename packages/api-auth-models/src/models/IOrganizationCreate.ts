// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdNodeObject } from "@3sixty/data-json-ld";
import type { IProof } from "@3sixty/standards-w3c-did";
import type { IOrganizationIdentityExport } from "./IOrganizationIdentityExport.js";

/**
 * The details of an organization to create.
 */
export interface IOrganizationCreate {
	/**
	 * The DID of an existing organization to register, a node controlled DID is created when omitted.
	 */
	identity?: string;

	/**
	 * The file of an organization identity export, as exported, to import onto the node and register,
	 * controlled by the node, instead of creating or naming one. Not allowed with the identity or
	 * proof. Its revocation index carries on, and the node never goes below the index it reached when
	 * it last registered the DID.
	 */
	identityImport?: IOrganizationIdentityExport;

	/**
	 * A proof by the DID over the organization proof document, required with the identity unless
	 * the caller is the node itself.
	 */
	proof?: IProof;

	/**
	 * The profile, such as a schema.org Organization.
	 */
	profile?: IJsonLdNodeObject;

	/**
	 * The logo, a schema.org ImageObject holding a data URL.
	 */
	logo?: IJsonLdNodeObject;

	/**
	 * The paths of the data that is public, such as profile.name or logo.
	 */
	publicData?: string[];
}
