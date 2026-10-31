// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IOAuthServiceConfig } from "./IOAuthServiceConfig.js";

/**
 * Options for the OAuthService constructor.
 */
export interface IOAuthServiceConstructorOptions {
	/**
	 * The authentication component that creates accounts and issues tokens.
	 * @default authentication
	 */
	authenticationComponentType?: string;

	/**
	 * The logging component.
	 * @default logging
	 */
	loggingComponentType?: string;

	/**
	 * The vault holding the key that signs the sign in kept by the browser.
	 * @default vault
	 */
	vaultConnectorType?: string;

	/**
	 * The configuration for the service.
	 */
	config: IOAuthServiceConfig;
}
