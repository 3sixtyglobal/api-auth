// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The address to send the browser to with the authorization code.
 */
export interface IAuthorizeResponse {
	/**
	 * The response details.
	 */
	body: {
		/**
		 * The redirect address with the code and state added.
		 */
		location: string;
	};
}
