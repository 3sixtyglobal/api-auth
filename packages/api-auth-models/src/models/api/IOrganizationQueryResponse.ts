// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IOrganization } from "../IOrganization.js";

/**
 * The organizations.
 */
export interface IOrganizationQueryResponse {
	/**
	 * The response body.
	 */
	body: {
		/**
		 * The returned organizations.
		 */
		entities: IOrganization[];

		/**
		 * The cursor to retrieve the next page, if any.
		 */
		cursor?: string;
	};
}
