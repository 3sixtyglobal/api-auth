// Copyright 2026 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuthenticationUserCreate } from "../IAuthenticationUserCreate.js";

/**
 * Create a new user as an admin.
 */
export interface IAdminUserCreateRequest {
	/**
	 * The body of the request.
	 */
	body: IAuthenticationUserCreate;
}
