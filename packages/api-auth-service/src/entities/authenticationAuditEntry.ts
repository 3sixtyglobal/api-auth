// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { SortDirection, entity, property } from "@twin.org/entity";

/**
 * Class defining the storage for authentication audit entries.
 */
@entity()
export class AuthenticationAuditEntry {
	/**
	 * The unique identifier for the audit entry.
	 */
	@property({ type: "string", isPrimary: true, maxLength: 255 })
	public id!: string;

	/**
	 * The timestamp of the audit entry in ISO 8601 format.
	 */
	@property({
		type: "string",
		format: "date-time",
		isSecondary: true,
		indexGroup: [{ name: "actorDate", direction: SortDirection.Descending, index: 1 }]
	})
	public dateCreated!: string;

	/**
	 * The audit event that occurred.
	 */
	@property({
		type: "string",
		maxLength: 128,
		isSecondary: true
	})
	public event!: string;

	/**
	 * The actor identifier, could be e-mail, username, or other unique identifier.
	 */
	@property({
		type: "string",
		maxLength: 255,
		isSecondary: true,
		optional: true,
		indexGroup: [{ name: "actorDate", direction: SortDirection.Ascending, index: 0 }]
	})
	public actorId?: string;

	/**
	 * The node identifier associated with the audit entry, if applicable.
	 */
	@property({ type: "string", maxLength: 255, isSecondary: true, optional: true })
	public nodeId?: string;

	/**
	 * The organization identifier associated with the audit entry, if applicable.
	 */
	@property({ type: "string", maxLength: 255, isSecondary: true, optional: true })
	public organizationId?: string;

	/**
	 * The tenant identifier associated with the audit entry, if applicable.
	 */
	@property({
		type: "string",
		maxLength: 255,
		isSecondary: true,
		optional: true
	})
	public tenantId?: string;

	/**
	 * The hashed IP addresses of the client.
	 */
	@property({ type: "array", optional: true })
	public ipAddressHashes?: string[];

	/**
	 * The user agent string of the client.
	 */
	@property({ type: "string", maxLength: 1024, optional: true })
	public userAgent?: string;

	/**
	 * The correlation ID for request tracing.
	 */
	@property({ type: "string", maxLength: 255, optional: true })
	public correlationId?: string;

	/**
	 * Additional data related to the audit entry, such as IP address, user agent, etc.
	 */
	@property({ type: "object", optional: true })
	public data?: unknown;
}
