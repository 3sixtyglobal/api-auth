// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { OrganizationRequestStatus } from "@3sixty/api-auth-models";
import { entity, property, SortDirection } from "@3sixty/entity";

/**
 * Class defining the storage for a request by an account to join an organization.
 */
@entity()
export class OrganizationRequest {
	/**
	 * The unique identifier of the request.
	 */
	@property({ type: "string", isPrimary: true })
	public id!: string;

	/**
	 * The account asking to join.
	 */
	@property({ type: "string", maxLength: 255, isSecondary: true })
	public accountId!: string;

	/**
	 * The DID of the organization to join.
	 */
	@property({ type: "string", maxLength: 255, isSecondary: true })
	public organization!: string;

	/**
	 * The status of the request.
	 */
	@property({ type: "string", maxLength: 20, isSecondary: true })
	public status!: OrganizationRequestStatus;

	/**
	 * The i18n key of the reason given when the request was rejected.
	 */
	@property({ type: "string", optional: true })
	public reason?: string;

	/**
	 * When the request was made, in ISO date format.
	 */
	@property({ type: "string", format: "date-time", sortDirection: SortDirection.Ascending })
	public dateCreated!: string;

	/**
	 * When the request was last modified, in ISO date format.
	 */
	@property({ type: "string", format: "date-time", sortDirection: SortDirection.Descending })
	public dateModified!: string;
}
