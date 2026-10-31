// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The status of a request to join an organization.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const OrganizationRequestStatus = {
	/**
	 * Waiting for an admin to accept or reject it.
	 */
	Pending: "pending",

	/**
	 * Accepted, the account has joined the organization.
	 */
	Accepted: "accepted",

	/**
	 * Rejected by an admin.
	 */
	Rejected: "rejected"
} as const;

/**
 * The status of a request to join an organization.
 */
export type OrganizationRequestStatus =
	(typeof OrganizationRequestStatus)[keyof typeof OrganizationRequestStatus];
