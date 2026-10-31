// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdNodeObject } from "@3sixty/data-json-ld";

/**
 * Replace the profiles of an organization.
 */
export interface IOrganizationUpdateRequest {
	/**
	 * The path parameters for the request.
	 */
	pathParams: {
		/**
		 * The unique identifier or the DID of the organization.
		 */
		id: string;
	};

	/**
	 * The profiles, those omitted are unchanged.
	 */
	body: {
		/**
		 * The profile shown to others.
		 */
		publicProfile?: IJsonLdNodeObject;

		/**
		 * The profile only shown to the members and admins.
		 */
		privateProfile?: IJsonLdNodeObject;
	};
}
