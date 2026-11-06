// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IHttpHeaders } from "@3sixty/web";
import type { IOAuthAccessToken } from "../IOAuthAccessToken.js";

/**
 * The access token issued for an OAuth 2.0 authorization code.
 * @see https://datatracker.ietf.org/doc/html/rfc6749#section-5.1
 */
export interface ITokenResponse {
	/**
	 * The response headers, which stop the token being cached.
	 */
	headers: IHttpHeaders;

	/**
	 * The response details.
	 */
	body: IOAuthAccessToken;
}
