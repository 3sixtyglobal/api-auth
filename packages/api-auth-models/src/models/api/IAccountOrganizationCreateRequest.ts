// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IAccountOrganizationCreate } from "../IAccountOrganizationCreate.js";

/**
 * Create an organization for the signed in account.
 */
export interface IAccountOrganizationCreateRequest {
	/**
	 * The profile, logo and public data of the organization.
	 */
	body: IAccountOrganizationCreate;
}
