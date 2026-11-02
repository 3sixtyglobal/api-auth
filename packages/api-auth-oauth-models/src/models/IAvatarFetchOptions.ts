// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The limits a photo is fetched with from an authentication provider.
 */
export interface IAvatarFetchOptions {
	/**
	 * The largest photo accepted, in bytes.
	 * @default 1048576
	 */
	maxBytes?: number;

	/**
	 * How long to wait for a photo, including reading its body, in milliseconds.
	 * @default 10000
	 */
	timeoutMs?: number;
}
