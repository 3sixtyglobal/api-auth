// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The number of requests to join an organization, counted up to a cap so counting stays bounded on
 * every storage.
 */
export interface IOrganizationRequestCount {
	/**
	 * The number of requests, the cap when there are more.
	 */
	count: number;

	/**
	 * True when there are more requests than the cap, so the count is the cap.
	 */
	capped: boolean;
}
