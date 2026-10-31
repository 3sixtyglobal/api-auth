// Copyright 2024 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdNodeObject } from "@3sixty/data-json-ld";
import type { HeaderTypes } from "@3sixty/web";

/**
 * Response from a login on the server.
 */
export interface ILoginResponse {
	/**
	 * Response headers.
	 */
	headers?: {
		/**
		 * The cookie containing the auth token.
		 */
		[HeaderTypes.SetCookie]?: string;
	};

	/**
	 * The login response details.
	 */
	body: {
		/**
		 * The account that signed in, the token subject.
		 */
		accountId: string;

		/**
		 * The expiry time of the token.
		 */
		expiry: number;

		/**
		 * The profile the authentication provider holds, a schema.org Person unless the provider sets another type.
		 */
		profile?: IJsonLdNodeObject;

		/**
		 * True when the authentication provider owns the profile, so it can only be edited with that provider.
		 */
		profileReadOnly?: boolean;

		/**
		 * The address where the profile can be edited, when the authentication provider owns it.
		 */
		profileEditUrl?: string;

		/**
		 * The address where the password is changed, when the authentication provider manages it.
		 */
		passwordChangeUrl?: string;
	};
}
