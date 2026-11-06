// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuthorizationCodeRequest } from "../IAuthorizationCodeRequest.js";

/**
 * Check the e-mail address and password of a password account and issue an OAuth 2.0 authorization code.
 */
export interface IAuthorizeRequest {
	/**
	 * The body of the request.
	 */
	body: IAuthorizationCodeRequest & {
		/**
		 * The e-mail address of the account.
		 */
		email: string;

		/**
		 * The password of the account.
		 */
		password: string;
	};
}
