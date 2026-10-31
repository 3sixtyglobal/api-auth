// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuthenticationProviderCapabilities } from "./IAuthenticationProviderCapabilities.js";

/**
 * An enabled authentication provider and what it supports.
 */
export interface IAuthenticationProviderDetails extends IAuthenticationProviderCapabilities {
	/**
	 * The authentication provider id, as registered with the authentication provider factory.
	 */
	authProviderId: string;
}
