// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdNodeObject } from "@3sixty/data-json-ld";

/**
 * The changes to the profile, logo and public data of an organization, those omitted are unchanged.
 */
export interface IOrganizationProfileUpdate {
	/**
	 * The profile, such as a schema.org Organization.
	 */
	profile?: IJsonLdNodeObject;

	/**
	 * The logo, a schema.org ImageObject holding a data URL, null removes it.
	 */
	logo?: IJsonLdNodeObject | null;

	/**
	 * The paths of the data that is public, such as profile.name or logo.
	 */
	publicData?: string[];
}
