// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuthenticationProviderDetails } from "@3sixty/api-auth-models";

/**
 * The authentication providers enabled on the server.
 */
export interface IProvidersResponse {
	/**
	 * The response details.
	 */
	body: {
		/**
		 * The providers and what each supports, in the order they were registered.
		 */
		providers: IAuthenticationProviderDetails[];
	};
}
