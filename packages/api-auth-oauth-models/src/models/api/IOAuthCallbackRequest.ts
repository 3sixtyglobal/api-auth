// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The browser returning from a provider.
 */
export interface IOAuthCallbackRequest {
	/**
	 * The path parameters for the request.
	 */
	pathParams: {
		/**
		 * The authentication provider id.
		 */
		authProviderId: string;
	};

	/**
	 * The query parameters from the provider.
	 */
	query?: {
		/**
		 * The authorization code, when the sign in succeeded.
		 */
		code?: string;

		/**
		 * The state sent with the authorization request.
		 */
		state?: string;

		/**
		 * The error code, when the sign in did not succeed.
		 */
		error?: string;
	};
}
