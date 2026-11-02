// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IOrganizationRequestDetails } from "../IOrganizationRequestDetails.js";

/**
 * The requests of the signed in account to join organizations.
 */
export interface IAccountOrganizationRequestGetResponse {
	/**
	 * The response body.
	 */
	body: {
		/**
		 * The latest request to each organization, pending or answered, the latest changed first.
		 */
		requests: IOrganizationRequestDetails[];
	};
}
