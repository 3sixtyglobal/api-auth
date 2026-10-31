// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuthenticationUser } from "../IAuthenticationUser.js";

/**
 * The users found by an admin query.
 */
export interface IAdminUserQueryResponse {
	/**
	 * The response body.
	 */
	body: {
		/**
		 * The returned users.
		 */
		entities: IAuthenticationUser[];

		/**
		 * The cursor to retrieve the next page, if any.
		 */
		cursor?: string;
	};
}
