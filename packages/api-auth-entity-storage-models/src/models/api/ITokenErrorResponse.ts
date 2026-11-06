// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { HttpStatusCode, IHttpHeaders } from "@3sixty/web";

/**
 * A token request that was refused, with the error codes RFC 6749 gives them.
 * @see https://datatracker.ietf.org/doc/html/rfc6749#section-5.2
 */
export interface ITokenErrorResponse {
	/**
	 * Response status code.
	 */
	statusCode: typeof HttpStatusCode.badRequest;

	/**
	 * The response headers, which stop the response being cached.
	 */
	headers: IHttpHeaders;

	/**
	 * The response details.
	 */
	body: {
		/**
		 * The error code, such as invalid_grant, invalid_request or unsupported_grant_type.
		 */
		error: string;
	};
}
