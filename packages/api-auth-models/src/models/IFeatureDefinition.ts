// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IFeature } from "./IFeature.js";

/**
 * A feature as a node extension declares it, with the roles that can use it.
 */
export interface IFeatureDefinition extends IFeature {
	/**
	 * The roles that can use the feature, an account needs one of them, held directly or inherited.
	 * The node seeds an authorization policy for each role of the features registered when it starts,
	 * which the feature component checks.
	 */
	roles: string[];
}
