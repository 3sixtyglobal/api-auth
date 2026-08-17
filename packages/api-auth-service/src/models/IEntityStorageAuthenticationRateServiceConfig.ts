// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
/**
 * Configuration for the entity storage authentication rate service.
 */
export interface IEntityStorageAuthenticationRateServiceConfig {
	/**
	 * Interval between cleanup runs in minutes.
	 * @default 5
	 */
	cleanupIntervalMinutes?: number;
}
