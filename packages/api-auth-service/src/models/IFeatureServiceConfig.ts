// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Config for the FeatureService constructor.
 */
export interface IFeatureServiceConfig {
	/**
	 * The authorization model ID the roles of the accounts are given in.
	 * @default system
	 */
	authorizationModelId?: string;
}
