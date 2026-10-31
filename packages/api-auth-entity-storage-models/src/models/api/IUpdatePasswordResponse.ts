// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { HeaderTypes } from "@3sixty/web";

/**
 * Response from updating the current user's password, with the new token for the current session.
 */
export interface IUpdatePasswordResponse {
	/**
	 * Response headers.
	 */
	headers?: {
		/**
		 * The cookie containing the auth token, when the request was authenticated by cookie.
		 */
		[HeaderTypes.SetCookie]?: string;
	};

	/**
	 * The new token details.
	 */
	body: {
		/**
		 * The new token, when the request was not authenticated by cookie.
		 */
		token?: string;

		/**
		 * The expiry time of the token.
		 */
		expiry: number;
	};
}
