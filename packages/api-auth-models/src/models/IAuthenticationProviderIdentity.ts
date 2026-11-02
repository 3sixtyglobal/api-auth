// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdNodeObject } from "@3sixty/data-json-ld";
import type { ImageObjectLeaf, WithContext } from "schema-dts";

/**
 * The identity an authentication provider has verified.
 */
export interface IAuthenticationProviderIdentity {
	/**
	 * The account identifier issued by the provider.
	 */
	providerAccountId: string;

	/**
	 * The id of the account in the node's own storage, set by providers that hold their accounts there,
	 * so the account can be read by its id.
	 */
	accountId?: string;

	/**
	 * The tenant the provider signed the account in from, such as the Microsoft tenant id.
	 */
	providerTenantId?: string;

	/**
	 * The e-mail address the provider holds for the account.
	 */
	email: string;

	/**
	 * The profile the provider holds, a schema.org Person unless the provider sets another type.
	 */
	profile?: IJsonLdNodeObject;

	/**
	 * True when the provider owns the profile, so it can only be edited with the provider.
	 */
	profileReadOnly?: boolean;

	/**
	 * The photo the provider holds, a schema.org ImageObject with a data URL. Null when the provider
	 * holds none, so a stored one is removed, and left out when it is not known, such as when it could
	 * not be fetched, so a stored one is kept.
	 */
	avatar?: WithContext<ImageObjectLeaf> | null;

	/**
	 * The address where the profile can be edited, when the provider owns it.
	 */
	profileEditUrl?: string;

	/**
	 * The address where the password is changed, when the provider manages it.
	 */
	passwordChangeUrl?: string;
}
