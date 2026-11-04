// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IFeature } from "../IFeature.js";

/**
 * The features the signed in account can use.
 */
export interface IFeatureListResponse {
	/**
	 * The response body.
	 */
	body: {
		/**
		 * The features.
		 */
		features: IFeature[];
	};
}
