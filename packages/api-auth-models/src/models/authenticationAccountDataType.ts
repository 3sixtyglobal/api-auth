// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The common types of account data, any other type may also be stored, with a JSON object as its
 * value. Types are stored in kebab case, so every value here is kebab case.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const AuthenticationAccountDataType = {
	/**
	 * The profile shown to others, an object.
	 */
	PublicProfile: "public-profile",

	/**
	 * The profile kept private to the account, an object.
	 */
	PrivateProfile: "private-profile",

	/**
	 * The picture of the account, a schema.org ImageObject holding a data URL, one item per account.
	 */
	Avatar: "avatar",

	/**
	 * The DID of the account, a JSON-LD node with the DID context and the DID as its id.
	 */
	Identity: "identity",

	/**
	 * The organization of the account, a schema.org Organization with the DID as its identifier.
	 */
	Organization: "organization",

	/**
	 * A verifiable credential held by the account, one row per credential, a JSON credential object
	 * with an embedded proof, such as an organization membership credential.
	 */
	VerifiableCredential: "vc"
} as const;

/**
 * The common types of account data.
 */
export type AuthenticationAccountDataType =
	(typeof AuthenticationAccountDataType)[keyof typeof AuthenticationAccountDataType];
