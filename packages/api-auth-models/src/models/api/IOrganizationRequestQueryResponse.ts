// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IOrganizationRequestDetails } from "../IOrganizationRequestDetails.js";

/**
 * The requests to join an organization.
 */
export interface IOrganizationRequestQueryResponse {
	/**
	 * The response body.
	 */
	body: {
		/**
		 * The returned requests.
		 */
		entities: IOrganizationRequestDetails[];

		/**
		 * The cursor to retrieve the next page, if any.
		 */
		cursor?: string;
	};
}
