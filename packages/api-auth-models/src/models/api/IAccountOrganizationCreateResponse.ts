// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IOrganization } from "../IOrganization.js";

/**
 * The organization created for the signed in account.
 */
export interface IAccountOrganizationCreateResponse {
	/**
	 * The response status code, created.
	 */
	statusCode: 201;

	/**
	 * The response headers.
	 */
	headers: {
		/**
		 * The location of the organization.
		 */
		location: string;
	};

	/**
	 * The organization.
	 */
	body: IOrganization;
}
