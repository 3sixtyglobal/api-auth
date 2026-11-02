// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IOrganizationMember } from "../IOrganizationMember.js";

/**
 * The members of an organization.
 */
export interface IOrganizationMemberQueryResponse {
	/**
	 * The response body.
	 */
	body: {
		/**
		 * The returned members.
		 */
		entities: IOrganizationMember[];

		/**
		 * The cursor to retrieve the next page, if any.
		 */
		cursor?: string;
	};
}
