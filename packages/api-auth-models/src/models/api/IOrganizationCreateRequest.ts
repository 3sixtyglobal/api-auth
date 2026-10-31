// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IOrganizationCreate } from "../IOrganizationCreate.js";

/**
 * Create an organization.
 */
export interface IOrganizationCreateRequest {
	/**
	 * The details of the organization.
	 */
	body: IOrganizationCreate;
}
