// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The types of the files the node exports, held in their type field so an import can check it was
 * given the right kind of file before doing anything else.
 */
export const ExportFileType = {
	/**
	 * The identity of an account with its private keys and credentials.
	 */
	AccountIdentity: "account-identity",

	/**
	 * The account data of an account, other than its identity.
	 */
	AccountProfile: "account-profile",

	/**
	 * The identity of an organization with its private keys.
	 */
	OrganizationIdentity: "organization-identity"
} as const;

/**
 * The types of the files the node exports.
 */
export type ExportFileType = (typeof ExportFileType)[keyof typeof ExportFileType];
