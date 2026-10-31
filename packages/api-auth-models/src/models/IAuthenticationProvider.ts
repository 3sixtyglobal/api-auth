// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IComponent } from "@3sixty/core";
import type { IAuthenticationProviderCapabilities } from "./IAuthenticationProviderCapabilities.js";
import type { IAuthenticationProviderIdentity } from "./IAuthenticationProviderIdentity.js";

/**
 * Contract for a provider that verifies credentials, registered under its authentication provider id.
 */
export interface IAuthenticationProvider<T = unknown> extends IComponent {
	/**
	 * Verify the credentials and return the identity they belong to.
	 * @param credentials The provider specific credentials.
	 * @returns The verified identity.
	 * @throws UnauthorizedError when the credentials are not valid.
	 */
	authenticate(credentials: T): Promise<IAuthenticationProviderIdentity>;

	/**
	 * Get what the provider supports, so a client knows how to present it.
	 * @param providerTenantId The tenant of an account, for its own addresses where they differ.
	 * @returns The provider capabilities.
	 */
	getCapabilities(providerTenantId?: string): IAuthenticationProviderCapabilities;
}
