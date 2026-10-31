// Copyright 2024 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { EntitySchemaFactory, EntitySchemaHelper } from "@3sixty/entity";
import { type ISchemaMigration, SchemaMigrationFactory } from "@3sixty/entity-storage-models";
import { nameof } from "@3sixty/nameof";
import { AuthenticationAuditEntry } from "./entities/authenticationAuditEntry.js";
import { AuthenticationAuditEntryV0 } from "./entities/authenticationAuditEntryV0.js";
import { AuthenticationRateEntry } from "./entities/authenticationRateEntry.js";
/**
 * Initialize the schema for the authentication audit and rate services.
 */
export function initSchema(): void {
	EntitySchemaFactory.register(nameof<AuthenticationAuditEntry>(), () =>
		EntitySchemaHelper.getSchema(AuthenticationAuditEntry)
	);
	EntitySchemaFactory.register(nameof<AuthenticationAuditEntryV0>(), () =>
		EntitySchemaHelper.getSchema(AuthenticationAuditEntryV0)
	);
	EntitySchemaFactory.register(nameof<AuthenticationRateEntry>(), () =>
		EntitySchemaHelper.getSchema(AuthenticationRateEntry)
	);

	// The client IP address is now a single address, so the first of the stored hashes is kept.
	const migrationAuditV0V1: ISchemaMigration<
		AuthenticationAuditEntryV0 & Partial<AuthenticationAuditEntry>,
		AuthenticationAuditEntry
	> = {
		transformEntity: async entity => ({
			...entity,
			ipAddressHash: entity.ipAddressHashes?.[0]
		})
	};
	SchemaMigrationFactory.register(
		`${nameof<AuthenticationAuditEntry>()}_0_1`,
		() => migrationAuditV0V1 as ISchemaMigration
	);
}
