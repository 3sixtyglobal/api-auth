// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The Argon2id parameters used to hash new passwords.
 */
export interface IPasswordHashOptions {
	/**
	 * The number of iterations.
	 * @default 2
	 */
	iterations?: number;

	/**
	 * The memory to use in kibibytes.
	 * @default 19456
	 */
	memoryKiB?: number;

	/**
	 * The degree of parallelism.
	 * @default 1
	 */
	parallelism?: number;
}
