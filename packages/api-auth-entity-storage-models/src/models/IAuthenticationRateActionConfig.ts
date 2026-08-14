// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Configuration for an authentication rate limited action.
 */
export interface IAuthenticationRateActionConfig {
	/**
	 * Maximum number of failed attempts allowed per window.
	 */
	maxAttempts: number;

	/**
	 * Rate limit window duration in minutes.
	 */
	windowMinutes: number;
}
