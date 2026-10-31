// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IOrganizationRequestDetails } from "../IOrganizationRequestDetails.js";

/**
 * The request to join an organization.
 */
export interface IOrganizationRequestGetResponse {
	/**
	 * The request.
	 */
	body: IOrganizationRequestDetails;
}
