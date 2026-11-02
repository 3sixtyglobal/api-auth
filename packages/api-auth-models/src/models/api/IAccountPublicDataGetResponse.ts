// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IJsonLdNodeObject } from "@3sixty/data-json-ld";

/**
 * The public data of an account or organization.
 */
export interface IAccountPublicDataGetResponse {
	/**
	 * The public JSON-LD objects, empty when nothing is public.
	 */
	body: IJsonLdNodeObject[];
}
