// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The common types of account data, any other type may also be stored, with a JSON object as its
 * value. Types are stored in kebab case, so every value here is kebab case.
 */
export const AuthenticationAccountDataType = {
	/**
	 * The profile of the account or organization, one item, a JSON-LD object such as a schema.org
	 * Person or Organization.
	 */
	Profile: "profile",

	/**
	 * Which properties of the data of the owner are public, one item, a schema.org ItemList whose
	 * itemListElement holds paths, the first segment an account data type and any further segments a
	 * nested property, such as logo, profile.address or profile.address.addressLocality.
	 */
	PublicData: "public-data",

	/**
	 * The logo of an organization, a schema.org ImageObject holding a data URL, one item.
	 */
	Logo: "logo",

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
