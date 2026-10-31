// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IOrganizationRequestCount } from "../IOrganizationRequestCount.js";

/**
 * The number of requests to join an organization.
 */
export interface IOrganizationRequestCountResponse {
	/**
	 * The response body.
	 */
	body: IOrganizationRequestCount;
}
