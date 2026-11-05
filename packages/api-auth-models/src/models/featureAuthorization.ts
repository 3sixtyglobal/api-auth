// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * How access to a feature is checked, as the object prefix and action of its authorization policies.
 * The object of a feature's policies is the prefix followed by the name of the feature.
 */
export const FeatureAuthorization = {
	/**
	 * The prefix of the object of a feature's policies.
	 */
	ObjectPrefix: "feature:",

	/**
	 * The action of a feature's policies.
	 */
	Action: "execute"
} as const;

/**
 * How access to a feature is checked.
 */
export type FeatureAuthorization = (typeof FeatureAuthorization)[keyof typeof FeatureAuthorization];
