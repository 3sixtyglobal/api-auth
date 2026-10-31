// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Login through an authentication provider.
 */
export interface ILoginWithProviderRequest {
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
	 * The provider specific credentials.
	 */
	body: {
		[id: string]: unknown;
	};
}
