// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { entity, property } from "@twin.org/entity";

/**
 * Class defining the storage for authentication audit entries.
 */
@entity()
export class AuthenticationAuditEntry {
	/**
	 * The unique identifier for the audit entry.
	 */
	@property({ type: "string", isPrimary: true })
	public id!: string;

	/**
	 * The timestamp of the audit entry in ISO 8601 format.
	 */
	@property({ type: "string", isSecondary: true })
	public dateCreated!: string;

	/**
	 * The audit event that occurred.
	 */
	@property({ type: "string", isSecondary: true })
	public event!: string;

	/**
	 * The actor identifier, could be e-mail, username, or other unique identifier.
	 */
	@property({ type: "string", isSecondary: true, optional: true })
	public actorId?: string;

	/**
	 * The node identifier associated with the audit entry, if applicable.
	 */
	@property({ type: "string", isSecondary: true, optional: true })
	public nodeId?: string;

	/**
	 * The organization identifier associated with the audit entry, if applicable.
	 */
	@property({ type: "string", isSecondary: true, optional: true })
	public organizationId?: string;

	/**
	 * The tenant identifier associated with the audit entry, if applicable.
	 */
	@property({ type: "string", isSecondary: true, optional: true })
	public tenantId?: string;

	/**
	 * The hashed IP addresses of the client.
	 */
	@property({ type: "array", optional: true })
	public ipAddressHashes?: string[];

	/**
	 * The user agent string of the client.
	 */
	@property({ type: "string", optional: true })
	public userAgent?: string;

	/**
	 * The correlation ID for request tracing.
	 */
	@property({ type: "string", optional: true })
	public correlationId?: string;

	/**
	 * Additional data related to the audit entry, such as IP address, user agent, etc.
	 */
	@property({ type: "object", optional: true })
	public data?: unknown;
}
