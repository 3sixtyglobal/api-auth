// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { entity, property, SortDirection } from "@3sixty/entity";

/**
 * Class defining the storage for an organization registered on the node, its profiles are held as
 * account data owned by its id.
 */
@entity()
export class Organization {
	/**
	 * The unique identifier of the organization.
	 */
	@property({ type: "string", isPrimary: true })
	public id!: string;

	/**
	 * The DID of the organization, held by only one organization.
	 */
	@property({ type: "string", maxLength: 255, isSecondary: true })
	public identity!: string;

	/**
	 * The name from the public profile in lower case, to search the organizations by name, empty when it has none.
	 */
	@property({ type: "string", maxLength: 255, isSecondary: true })
	public searchName!: string;

	/**
	 * The revocation index to give the next membership credential the organization issues, zero
	 * when omitted.
	 */
	@property({ type: "integer", optional: true })
	public nextRevocationIndex?: number;

	/**
	 * True when the node created or imported the DID, so its keys are removed with the organization.
	 */
	@property({ type: "boolean", optional: true })
	public identityHeld?: boolean;

	/**
	 * When the organization was created, in ISO date format.
	 */
	@property({ type: "string", format: "date-time", sortDirection: SortDirection.Ascending })
	public dateCreated!: string;

	/**
	 * When the organization was last modified, in ISO date format.
	 */
	@property({ type: "string", format: "date-time" })
	public dateModified!: string;
}
