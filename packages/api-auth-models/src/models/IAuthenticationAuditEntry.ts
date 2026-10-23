// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { AuthAuditEvent } from "./authAuditEvent.js";

/**
 * Contract definition for authentication audit entry.
 */
export interface IAuthenticationAuditEntry {
	/**
	 * The unique identifier for the audit entry.
	 */
	id: string;

	/**
	 * The audit event that occurred.
	 */
	event: AuthAuditEvent | string;

	/**
	 * The timestamp of the audit entry in ISO 8601 format.
	 */
	dateCreated: string;

	/**
	 * The actor identifier, could be e-mail, username, or other unique identifier.
	 */
	actorId?: string;

	/**
	 * The node identifier associated with the audit entry, if applicable.
	 */
	nodeId?: string;

	/**
	 * The organization identifier associated with the audit entry, if applicable.
	 */
	organizationId?: string;

	/**
	 * The tenant identifier associated with the audit entry, if applicable.
	 */
	tenantId?: string;

	/**
	 * The hashed IP addresses of the client.
	 */
	ipAddressHashes?: string[];

	/**
	 * The user agent string of the client.
	 */
	userAgent?: string;

	/**
	 * The correlation ID for request tracing.
	 */
	correlationId?: string;

	/**
	 * Additional data related to the audit entry, such as IP address, user agent, etc.
	 */
	data?: unknown;
}
