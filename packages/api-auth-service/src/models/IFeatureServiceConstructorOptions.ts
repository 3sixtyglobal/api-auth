// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IFeatureServiceConfig } from "./IFeatureServiceConfig.js";

/**
 * Options for the FeatureService constructor.
 */
export interface IFeatureServiceConstructorOptions {
	/**
	 * The authorization component that holds the roles of the accounts.
	 * @default authorization
	 */
	authorizationComponentType?: string;

	/**
	 * The configuration for the feature service.
	 */
	config?: IFeatureServiceConfig;
}
