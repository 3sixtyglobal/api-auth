// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { HttpStatusCode, IHttpHeaders } from "@3sixty/web";

/**
 * Send the browser to another address.
 */
export interface IOAuthRedirectResponse {
	/**
	 * Response status code.
	 */
	statusCode: typeof HttpStatusCode.found;

	/**
	 * The response headers, including the location.
	 */
	headers: IHttpHeaders;
}
