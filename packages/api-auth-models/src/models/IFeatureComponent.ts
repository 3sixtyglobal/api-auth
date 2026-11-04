// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IComponent } from "@3sixty/core";
import type { IFeature } from "./IFeature.js";

/**
 * Contract definition for the component that lists the features of the node's extensions.
 */
export interface IFeatureComponent extends IComponent {
	/**
	 * List the features the signed in account can use.
	 * @returns The features.
	 */
	list(): Promise<IFeature[]>;
}
