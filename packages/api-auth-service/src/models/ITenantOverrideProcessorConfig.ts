// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Configuration for the TenantOverrideProcessor.
 */
export interface ITenantOverrideProcessorConfig {
	/**
	 * Include the stack with errors.
	 */
	includeErrorStack?: boolean;

	/**
	 * The role value that grants escalated privilege for cross-tenant access.
	 * @default global-admin
	 */
	escalatedPrivilegeRole?: string;

	/**
	 * The authorization model ID to use for REST requests.
	 * @default rest
	 */
	authorizationModelId?: string;
}
