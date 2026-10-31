// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IMicrosoftOAuthProviderConnectorConfig } from "./IMicrosoftOAuthProviderConnectorConfig.js";

/**
 * Options for the MicrosoftOAuthProviderConnector constructor.
 */
export interface IMicrosoftOAuthProviderConnectorConstructorOptions {
	/**
	 * The client registered with Microsoft.
	 */
	config: IMicrosoftOAuthProviderConnectorConfig;

	/**
	 * The type of the logging component, a failure to fetch the profile photo is logged.
	 * @default logging
	 */
	loggingComponentType?: string;
}
