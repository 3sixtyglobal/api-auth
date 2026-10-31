// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { OrganizationRequestStatus } from "./organizationRequestStatus.js";

/**
 * A request by an account to join an organization.
 */
export interface IOrganizationRequestDetails {
	/**
	 * The unique identifier of the request.
	 */
	id: string;

	/**
	 * The account asking to join.
	 */
	accountId: string;

	/**
	 * The DID of the organization to join.
	 */
	organization: string;

	/**
	 * The status of the request.
	 */
	status: OrganizationRequestStatus;

	/**
	 * The i18n key of the reason given when the request was rejected, for the client to translate.
	 */
	reason?: string;

	/**
	 * When the request was made, in ISO date format.
	 */
	dateCreated: string;

	/**
	 * When the request was last modified, in ISO date format.
	 */
	dateModified: string;
}
