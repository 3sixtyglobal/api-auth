// Copyright 2026 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuthenticationUser } from "../IAuthenticationUser.js";

/**
 * Update a user as an admin.
 */
export interface IAdminUserUpdateRequest {
	/**
	 * The path parameters for the request.
	 */
	pathParams: {
		/**
		 * The user email, or the account id.
		 */
		email: string;
	};

	/**
	 * The body of the request.
	 */
	body: Partial<Pick<IAuthenticationUser, "userIdentity" | "organizationIdentity">>;
}
