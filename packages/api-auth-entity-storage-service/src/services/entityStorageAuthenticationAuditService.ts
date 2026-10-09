// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type {
	AuthAuditEvent,
	IAuthenticationAuditComponent,
	IAuthenticationAuditEntry
} from "@3sixty/api-auth-entity-storage-models";
import { HttpContextIdKeys } from "@3sixty/api-models";
import { ContextIdStore, ContextIdKeys } from "@3sixty/context";
import {
	Converter,
	GeneralError,
	Guards,
	Is,
	NotFoundError,
	RandomHelper,
	Validation,
	type IValidationFailure
} from "@3sixty/core";
import { Sha256 } from "@3sixty/crypto";
import { ComparisonOperator } from "@3sixty/entity";
import {
	EntityStorageConnectorFactory,
	type IEntityStorageConnector
} from "@3sixty/entity-storage-models";
import { nameof } from "@3sixty/nameof";
import type { AuthenticationAuditEntry } from "../entities/authenticationAuditEntry.js";
import type { IEntityStorageAuthenticationAuditServiceConstructorOptions } from "../models/IEntityStorageAuthenticationAuditServiceConstructorOptions.js";

/**
 * Implementation of the authentication audit component using entity storage.
 */
export class EntityStorageAuthenticationAuditService implements IAuthenticationAuditComponent {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<EntityStorageAuthenticationAuditService>();

	/**
	 * The entity storage for authentication audit entries.
	 * @internal
	 */
	private readonly _authenticationAuditEntryEntityStorage: IEntityStorageConnector<AuthenticationAuditEntry>;

	/**
	 * The server-side salt for hashing IP addresses in audit logs, if configured.
	 * @internal
	 */
	private readonly _ipHashSalt?: string;

	/**
	 * Create a new instance of EntityStorageAuthenticationAuditService.
	 * @param options The dependencies for the identity connector.
	 */
	constructor(options?: IEntityStorageAuthenticationAuditServiceConstructorOptions) {
		this._authenticationAuditEntryEntityStorage = EntityStorageConnectorFactory.get(
			options?.authenticationAuditEntryStorageType ?? "authentication-audit-entry"
		);
		const salt = options?.config?.ipHashSalt?.trim();
		if (Is.stringValue(salt)) {
			const validationFailures: IValidationFailure[] = [];
			Validation.stringValue(
				nameof(options?.config?.ipHashSalt),
				salt,
				validationFailures,
				undefined,
				{ minLength: 32 }
			);
			const entropy = new Set(salt).size;
			if (entropy < 8) {
				validationFailures.push({
					property: nameof(options?.config?.ipHashSalt),
					reason: "validation.saltEntropyTooLow"
				});
			}
			Validation.asValidationError(
				EntityStorageAuthenticationAuditService.CLASS_NAME,
				nameof(options?.config?.ipHashSalt),
				validationFailures
			);

			this._ipHashSalt = salt;
		}
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return EntityStorageAuthenticationAuditService.CLASS_NAME;
	}

	/**
	 * Create a new audit entry.
	 * @param entry The audit entry to be logged.
	 * @returns The unique identifier of the created audit entry.
	 */
	public async create(
		entry: Omit<IAuthenticationAuditEntry, "id" | "dateCreated">
	): Promise<string> {
		Guards.object<IAuthenticationAuditEntry>(
			EntityStorageAuthenticationAuditService.CLASS_NAME,
			nameof(entry),
			entry
		);
		Guards.stringValue(
			EntityStorageAuthenticationAuditService.CLASS_NAME,
			nameof(entry.event),
			entry.event
		);

		const contextIds = await ContextIdStore.getContextIds();

		const newAuditEntry: AuthenticationAuditEntry = {
			id: RandomHelper.generateUuidV7("compact"),
			dateCreated: new Date().toISOString(),
			event: entry.event,
			actorId: entry.actorId ?? contextIds?.[ContextIdKeys.User],
			nodeId: entry.nodeId ?? contextIds?.[ContextIdKeys.Node],
			organizationId: entry.organizationId ?? contextIds?.[ContextIdKeys.Organization],
			tenantId: entry.tenantId ?? contextIds?.[ContextIdKeys.Tenant],
			data: entry.data,
			ipAddressHashes: this.hashIpAddresses(contextIds?.[HttpContextIdKeys.IpAddress]?.split("|")),
			userAgent: contextIds?.[HttpContextIdKeys.UserAgent],
			correlationId: contextIds?.[HttpContextIdKeys.CorrelationId]
		};

		try {
			await this._authenticationAuditEntryEntityStorage.set(newAuditEntry);
		} catch {
			// Best-effort audit logging: do not interrupt auth/admin flows if persistence fails.
		}

		return newAuditEntry.id;
	}

	/**
	 * Get an audit entry by id.
	 * @param id The unique identifier of the audit entry.
	 * @returns The audit entry.
	 */
	public async get(id: string): Promise<IAuthenticationAuditEntry> {
		Guards.stringValue(EntityStorageAuthenticationAuditService.CLASS_NAME, nameof(id), id);

		try {
			const entry = await this._authenticationAuditEntryEntityStorage.get(id);
			if (Is.empty(entry)) {
				throw new NotFoundError(
					EntityStorageAuthenticationAuditService.CLASS_NAME,
					"auditEntryNotFound",
					id
				);
			}

			return entry;
		} catch (error) {
			throw new GeneralError(
				EntityStorageAuthenticationAuditService.CLASS_NAME,
				"getAuditEntryFailed",
				undefined,
				error
			);
		}
	}

	/**
	 * Update an audit entry.
	 * @param id The unique identifier of the audit entry to update.
	 * @param entry The fields to update on the audit entry.
	 * @returns A promise that resolves when the audit entry has been updated.
	 */
	public async update(
		id: string,
		entry: Partial<Omit<IAuthenticationAuditEntry, "id" | "dateCreated">>
	): Promise<void> {
		Guards.stringValue(EntityStorageAuthenticationAuditService.CLASS_NAME, nameof(id), id);
		Guards.object(EntityStorageAuthenticationAuditService.CLASS_NAME, nameof(entry), entry);

		try {
			const existing = await this._authenticationAuditEntryEntityStorage.get(id);
			if (Is.empty(existing)) {
				throw new NotFoundError(
					EntityStorageAuthenticationAuditService.CLASS_NAME,
					"auditEntryNotFound",
					id
				);
			}

			await this._authenticationAuditEntryEntityStorage.set({
				...existing,
				...entry,
				id,
				dateCreated: existing.dateCreated
			});
		} catch (error) {
			throw new GeneralError(
				EntityStorageAuthenticationAuditService.CLASS_NAME,
				"updateAuditEntryFailed",
				undefined,
				error
			);
		}
	}

	/**
	 * Remove an audit entry.
	 * @param id The unique identifier of the audit entry to remove.
	 * @returns A promise that resolves when the audit entry has been removed.
	 */
	public async remove(id: string): Promise<void> {
		Guards.stringValue(EntityStorageAuthenticationAuditService.CLASS_NAME, nameof(id), id);

		try {
			const existing = await this._authenticationAuditEntryEntityStorage.get(id);
			if (Is.empty(existing)) {
				throw new NotFoundError(
					EntityStorageAuthenticationAuditService.CLASS_NAME,
					"auditEntryNotFound",
					id
				);
			}

			await this._authenticationAuditEntryEntityStorage.remove(id);
		} catch (error) {
			throw new GeneralError(
				EntityStorageAuthenticationAuditService.CLASS_NAME,
				"removeAuditEntryFailed",
				undefined,
				error
			);
		}
	}

	/**
	 * Query the audit entries.
	 * @param options The query options.
	 * @param options.actorId The actor identifier to filter the audit entries, optional.
	 * @param options.organizationId The organization identifier to filter the audit entries, optional.
	 * @param options.tenantId The tenant identifier to filter the audit entries, optional.
	 * @param options.nodeId The node identifier to filter the audit entries, optional.
	 * @param options.event The audit event to filter the audit entries, optional.
	 * @param options.startDate The start date to filter the audit entries, optional.
	 * @param options.endDate The end date to filter the audit entries, optional.
	 * @param cursor The cursor for pagination.
	 * @param limit The maximum number of entries to return.
	 * @returns The audit entries.
	 */
	public async query(
		options?: {
			actorId?: string;
			organizationId?: string;
			tenantId?: string;
			nodeId?: string;
			event?: AuthAuditEvent | string;
			startDate?: string;
			endDate?: string;
		},
		cursor?: string,
		limit?: number
	): Promise<{
		entries: IAuthenticationAuditEntry[];
		cursor?: string;
	}> {
		const conditions: {
			property: string;
			value: string;
			comparison: (typeof ComparisonOperator)[keyof typeof ComparisonOperator];
		}[] = [];

		if (Is.object(options)) {
			if (!Is.empty(options.actorId)) {
				Guards.stringValue(
					EntityStorageAuthenticationAuditService.CLASS_NAME,
					nameof(options.actorId),
					options.actorId
				);
				conditions.push({
					property: "actorId",
					value: options.actorId,
					comparison: ComparisonOperator.Equals
				});
			}

			if (!Is.empty(options.organizationId)) {
				Guards.stringValue(
					EntityStorageAuthenticationAuditService.CLASS_NAME,
					nameof(options.organizationId),
					options.organizationId
				);
				conditions.push({
					property: "organizationId",
					value: options.organizationId,
					comparison: ComparisonOperator.Equals
				});
			}

			if (!Is.empty(options.tenantId)) {
				Guards.stringValue(
					EntityStorageAuthenticationAuditService.CLASS_NAME,
					nameof(options.tenantId),
					options.tenantId
				);
				conditions.push({
					property: "tenantId",
					value: options.tenantId,
					comparison: ComparisonOperator.Equals
				});
			}

			if (!Is.empty(options.nodeId)) {
				Guards.stringValue(
					EntityStorageAuthenticationAuditService.CLASS_NAME,
					nameof(options.nodeId),
					options.nodeId
				);
				conditions.push({
					property: "nodeId",
					value: options.nodeId,
					comparison: ComparisonOperator.Equals
				});
			}

			if (!Is.empty(options.event)) {
				Guards.stringValue(
					EntityStorageAuthenticationAuditService.CLASS_NAME,
					nameof(options.event),
					options.event
				);
				conditions.push({
					property: "event",
					value: options.event,
					comparison: ComparisonOperator.Equals
				});
			}

			if (!Is.empty(options.startDate)) {
				Guards.stringValue(
					EntityStorageAuthenticationAuditService.CLASS_NAME,
					nameof(options.startDate),
					options.startDate
				);
				conditions.push({
					property: "dateCreated",
					value: options.startDate,
					comparison: ComparisonOperator.GreaterThanOrEqual
				});
			}

			if (!Is.empty(options.endDate)) {
				Guards.stringValue(
					EntityStorageAuthenticationAuditService.CLASS_NAME,
					nameof(options.endDate),
					options.endDate
				);
				conditions.push({
					property: "dateCreated",
					value: options.endDate,
					comparison: ComparisonOperator.LessThanOrEqual
				});
			}
		}

		const result = await this._authenticationAuditEntryEntityStorage.query(
			conditions.length > 0 ? { conditions } : undefined,
			undefined,
			undefined,
			cursor,
			limit
		);

		return {
			entries: result.entities as IAuthenticationAuditEntry[],
			cursor: result.cursor
		};
	}

	/**
	 * Hash a list of IP addresses using SHA-256.
	 * @param ipAddresses The IP addresses to hash.
	 * @returns The hexadecimal hashes of the salted IPs.
	 * @internal
	 */
	private hashIpAddresses(ipAddresses: string[] | undefined): string[] | undefined {
		if (!Is.stringValue(this._ipHashSalt) || !Is.array(ipAddresses)) {
			return undefined;
		}
		return ipAddresses.map(ip => {
			const hash = Sha256.sum256(Converter.utf8ToBytes(`${this._ipHashSalt}:${ip}`));
			return Converter.bytesToHex(hash);
		});
	}
}
