// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuthenticationProvider } from "@3sixty/api-auth-models";
import type { IOAuthAuthorizationRequest } from "./IOAuthAuthorizationRequest.js";
import type { IOAuthCodeExchange } from "./IOAuthCodeExchange.js";

/**
 * Contract for an authentication provider that signs accounts in through OAuth.
 */
export interface IOAuthProviderConnector extends IAuthenticationProvider<IOAuthCodeExchange> {
	/**
	 * Build the address that sends the browser to the provider to sign in.
	 * @param request The values for the authorization request.
	 * @returns The authorization address.
	 */
	authorizationUrl(request: IOAuthAuthorizationRequest): string;
}
