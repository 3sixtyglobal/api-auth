// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Get the authentication providers enabled on the server.
 */
export interface IProvidersRequest {
	/**
	 * The query parameters for the request.
	 */
	query?: {
		/**
		 * A comma separated list of the provider types to include, all types when left out.
		 */
		types?: string;
	};
}
