// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * A feature a node extension provides, such as a part of the user interface.
 */
export interface IFeature {
	/**
	 * The name of the feature, unique across the node.
	 */
	name: string;

	/**
	 * Settings the user interface needs to display the feature, never secrets.
	 */
	config?: { [key: string]: unknown };
}
