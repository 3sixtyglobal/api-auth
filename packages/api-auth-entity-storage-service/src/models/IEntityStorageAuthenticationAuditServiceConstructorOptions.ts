// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IEntityStorageAuthenticationAuditServiceConfig } from "./IEntityStorageAuthenticationAuditServiceConfig.js";

/**
 * Options for the EntityStorageAuthenticationAuditService constructor.
 */
export interface IEntityStorageAuthenticationAuditServiceConstructorOptions {
	/**
	 * The entity storage for the audit entries.
	 * @default authentication-audit-entry
	 */
	authenticationAuditEntryStorageType?: string;

	/**
	 * The configuration for the authentication audit service.
	 */
	config?: IEntityStorageAuthenticationAuditServiceConfig;
}
