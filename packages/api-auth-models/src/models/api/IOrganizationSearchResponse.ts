// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IOrganization } from "../IOrganization.js";

/**
 * The organizations whose name starts with the search.
 */
export interface IOrganizationSearchResponse {
	/**
	 * The response body.
	 */
	body: {
		/**
		 * The organizations with their public profiles.
		 */
		entities: IOrganization[];
	};
}
