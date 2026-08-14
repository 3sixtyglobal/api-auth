// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuthenticationUser } from "../IAuthenticationUser.js";

/**
 * Get a user as an admin.
 */
export interface IAdminUserGetResponse {
	/**
	 * The body of the request.
	 */
	body: IAuthenticationUser;
}
