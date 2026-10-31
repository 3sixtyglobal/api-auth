// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { SchemaOrgContexts } from "@3sixty/standards-schema-org";

/**
 * The value of an organization item of account data, a schema.org Organization identified by its DID.
 */
export interface IAccountOrganizationData {
	/**
	 * The JSON-LD context, schema.org.
	 */
	"@context": typeof SchemaOrgContexts.Context;

	/**
	 * The JSON-LD type.
	 */
	"@type": "Organization";

	/**
	 * The DID of the organization.
	 */
	identifier: string;
}
