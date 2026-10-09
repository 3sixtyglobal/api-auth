// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { HeaderTypes } from "@3sixty/web";

/**
 * Response from a refresh on the auth token.
 */
export interface IRefreshTokenResponse {
	/**
	 * Response headers.
	 */
	headers?: {
		/**
		 * The cookie containing the auth token.
		 */
		[HeaderTypes.SetCookie]?: string;
	};

	/**
	 * The refresh token details.
	 */
	body: {
		/**
		 * The expiry time of the token.
		 */
		expiry: number;
	};
}
