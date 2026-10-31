// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Start a sign in with a provider.
 */
export interface IOAuthStartRequest {
	/**
	 * The path parameters for the request.
	 */
	pathParams: {
		/**
		 * The authentication provider id.
		 */
		authProviderId: string;
	};
}
