// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { ITenantOverrideProcessorConfig } from "./ITenantOverrideProcessorConfig.js";

/**
 * Options for the TenantOverrideProcessor constructor.
 */
export interface ITenantOverrideProcessorConstructorOptions {
	/**
	 * The tenant admin component type.
	 * @default tenant-admin
	 */
	tenantAdminComponentType?: string;

	/**
	 * The authorization component type.
	 * @default authorization
	 */
	authorizationComponentType?: string;

	/**
	 * Configuration for the processor.
	 */
	config?: ITenantOverrideProcessorConfig;
}
