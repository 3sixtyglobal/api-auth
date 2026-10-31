// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IGoogleOAuthProviderConnectorConfig } from "./IGoogleOAuthProviderConnectorConfig.js";

/**
 * Options for the GoogleOAuthProviderConnector constructor.
 */
export interface IGoogleOAuthProviderConnectorConstructorOptions {
	/**
	 * The client registered with Google.
	 */
	config: IGoogleOAuthProviderConnectorConfig;

	/**
	 * The type of the logging component, a failure to fetch the profile photo is logged.
	 * @default logging
	 */
	loggingComponentType?: string;
}
