// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { EntitySchemaFactory, EntitySchemaHelper } from "@3sixty/entity";
import {
	MigrationHelper,
	SchemaMigrationFactory,
	type IResolvedMigrationStep
} from "@3sixty/entity-storage-models";
import { nameof } from "@3sixty/nameof";
import type { AuthenticationUser } from "../../src/entities/authenticationUser.js";

/**
 * Run the stored account forward to the current schema, the same way the node does at start-up.
 * @param entity The account as it was stored.
 * @param fromVersion The version it was stored at.
 * @returns The account at the current version.
 */
export async function migrateAuthenticationUser(
	entity: unknown,
	fromVersion: number
): Promise<AuthenticationUser> {
	const currentVersion = EntitySchemaHelper.getVersion(
		EntitySchemaFactory.get(nameof<AuthenticationUser>())
	);
	const steps: IResolvedMigrationStep[] = [];

	for (let version = fromVersion; version < currentVersion; version++) {
		const fromSchema = EntitySchemaFactory.get(`${nameof<AuthenticationUser>()}V${version}`);
		const toSchema =
			version + 1 < currentVersion
				? EntitySchemaFactory.get(`${nameof<AuthenticationUser>()}V${version + 1}`)
				: EntitySchemaFactory.get(nameof<AuthenticationUser>());
		const override = SchemaMigrationFactory.getIfExists(
			`${nameof<AuthenticationUser>()}_${version}_${version + 1}`
		);

		steps.push({
			fromProperties: fromSchema.properties ?? [],
			toProperties: toSchema.properties ?? [],
			renames: override?.renames,
			transformEntity: override?.transformEntity,
			transformEntityProperty: override?.transformEntityProperty,
			removeEntityProperty: override?.removeEntityProperty
		});
	}

	return (await MigrationHelper.applyEntityChain(entity, steps)) as AuthenticationUser;
}
