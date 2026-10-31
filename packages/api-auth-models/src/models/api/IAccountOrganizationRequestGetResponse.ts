// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IOrganizationRequestDetails } from "../IOrganizationRequestDetails.js";

/**
 * The request of the signed in account to join an organization.
 */
export interface IAccountOrganizationRequestGetResponse {
	/**
	 * The response body.
	 */
	body: {
		/**
		 * The pending request, otherwise the latest request, absent when none was made.
		 */
		request?: IOrganizationRequestDetails;
	};
}
