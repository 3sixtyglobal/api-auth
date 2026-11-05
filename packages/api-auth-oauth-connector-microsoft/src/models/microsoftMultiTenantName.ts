// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The Microsoft tenant names that accept accounts from more than one tenant.
 */
export const MicrosoftMultiTenantName = {
	/**
	 * Work, school and personal accounts.
	 */
	Common: "common",

	/**
	 * Work and school accounts.
	 */
	Organizations: "organizations",

	/**
	 * Personal accounts.
	 */
	Consumers: "consumers"
} as const;

/**
 * The Microsoft tenant names that accept accounts from more than one tenant.
 */
export type MicrosoftMultiTenantName =
	(typeof MicrosoftMultiTenantName)[keyof typeof MicrosoftMultiTenantName];
