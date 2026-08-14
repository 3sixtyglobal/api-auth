// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Config for the EntityStorageAuthenticationAuditService constructor.
 */
export interface IEntityStorageAuthenticationAuditServiceConfig {
	/**
	 * The server-side salt for hashing IP addresses in audit logs, if configured.
	 */
	ipHashSalt?: string;
}
