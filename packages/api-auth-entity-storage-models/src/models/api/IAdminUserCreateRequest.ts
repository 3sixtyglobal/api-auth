// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuthenticationUser } from "../IAuthenticationUser.js";

/**
 * Create a new user as an admin.
 */
export interface IAdminUserCreateRequest {
	/**
	 * The body of the request.
	 */
	body: IAuthenticationUser & { password: string };
}
