// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuthenticationAccountProcessorConfig } from "./IAuthenticationAccountProcessorConfig.js";

/**
 * Options for the AuthenticationAccountProcessor constructor.
 */
export interface IAuthenticationAccountProcessorConstructorOptions {
	/**
	 * The entity storage for the account data.
	 * @default account-data
	 */
	accountDataEntityStorageType?: string;

	/**
	 * The configuration for the processor.
	 */
	config?: IAuthenticationAccountProcessorConfig;
}
