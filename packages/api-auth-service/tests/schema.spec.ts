// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { EntitySchemaFactory, EntitySchemaHelper } from "@3sixty/entity";
import { MigrationHelper, SchemaMigrationFactory } from "@3sixty/entity-storage-models";
import { nameof } from "@3sixty/nameof";
import type { AuthenticationAuditEntry } from "../src/entities/authenticationAuditEntry.js";
import type { AuthenticationAuditEntryV0 } from "../src/entities/authenticationAuditEntryV0.js";
import { initSchema } from "../src/schema.js";

initSchema();

describe("initSchema", () => {
	test("registers the audit entry schema with a single ip address hash", () => {
		const schema = EntitySchemaFactory.get(nameof<AuthenticationAuditEntry>());

		expect(EntitySchemaHelper.getVersion(schema)).toBe(1);
		expect(schema.properties?.map(p => p.property)).toContain("ipAddressHash");
		expect(schema.properties?.map(p => p.property)).not.toContain("ipAddressHashes");
	});

	test("keeps the version 0 schema so it can be migrated", () => {
		const schema = EntitySchemaFactory.get(nameof<AuthenticationAuditEntryV0>());

		expect(EntitySchemaHelper.getVersion(schema)).toBe(0);
		expect(schema.properties?.map(p => p.property)).toContain("ipAddressHashes");
	});

	test("migrates the first ip address hash to the single hash", async () => {
		const migration = SchemaMigrationFactory.get(`${nameof<AuthenticationAuditEntry>()}_0_1`);
		const step = {
			fromProperties:
				EntitySchemaFactory.get(nameof<AuthenticationAuditEntryV0>()).properties ?? [],
			toProperties: EntitySchemaFactory.get(nameof<AuthenticationAuditEntry>()).properties ?? [],
			...migration
		};

		const migrated = await MigrationHelper.applyEntityChain(
			{
				id: "audit-1",
				dateCreated: "2026-04-13T10:11:12.000Z",
				event: "login-success",
				ipAddressHashes: ["hash-1", "hash-2"]
			},
			[step]
		);

		expect(migrated).toEqual({
			id: "audit-1",
			dateCreated: "2026-04-13T10:11:12.000Z",
			event: "login-success",
			ipAddressHash: "hash-1"
		});
	});

	test("migrates an entry without ip address hashes", async () => {
		const migration = SchemaMigrationFactory.get(`${nameof<AuthenticationAuditEntry>()}_0_1`);
		const step = {
			fromProperties:
				EntitySchemaFactory.get(nameof<AuthenticationAuditEntryV0>()).properties ?? [],
			toProperties: EntitySchemaFactory.get(nameof<AuthenticationAuditEntry>()).properties ?? [],
			...migration
		};

		const migrated = await MigrationHelper.applyEntityChain(
			{ id: "audit-1", dateCreated: "2026-04-13T10:11:12.000Z", event: "login-success" },
			[step]
		);

		expect(migrated).not.toHaveProperty("ipAddressHash");
	});
});
