// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { ContextIdStore, type IContextIds } from "@twin.org/context";
import { SharedStore } from "@twin.org/core";
import {
	EntitySchemaFactory,
	EntitySchemaHelper,
	type IEntitySchemaProperty
} from "@twin.org/entity";
import { type ISchemaMigration, SchemaMigrationFactory } from "@twin.org/entity-storage-models";
import { nameof } from "@twin.org/nameof";
import { AuthenticationUser } from "./entities/authenticationUser.js";
import { AuthenticationUserV0 } from "./entities/authenticationUserV0.js";

/**
 * Initialize the schema for the authentication service.
 */
export function initSchema(): void {
	EntitySchemaFactory.register(nameof<AuthenticationUser>(), () =>
		EntitySchemaHelper.getSchema(AuthenticationUser)
	);
	EntitySchemaFactory.register(nameof<AuthenticationUserV0>(), () =>
		EntitySchemaHelper.getSchema(AuthenticationUserV0)
	);

	const migrationV0V1: ISchemaMigration<AuthenticationUserV0, AuthenticationUser> = {
		removeEntityProperty: async (
			entity: AuthenticationUserV0,
			removedProperties: IEntitySchemaProperty<AuthenticationUserV0>[]
		): Promise<void> => {
			// If the scope property is not being removed, we don't need to do anything
			if (removedProperties.find(prop => prop.property === "scope") === undefined) {
				return;
			}

			const scopes = entity.scope
				.split(",")
				.map(role => role.trim().toLocaleLowerCase())
				.filter(role => role.length > 0);
			if (scopes.length === 0) {
				scopes.push("user");
			}

			// We need to store the old roles in here if a migration is performed
			// they will be picked up by the start method of the AuthenticationService
			// and used to populate the new roles table in the correct partition.
			// The same identity can exist across multiple partitions so we accumulate
			// entries as an array keyed by contextIds rather than by identity alone.
			const contextIds: IContextIds | undefined = await ContextIdStore.getContextIds();
			const migratedRoles =
				SharedStore.get<
					{ identity: string; roles: string[]; contextIds: IContextIds | undefined }[]
				>("migrationUserRoles") ?? [];
			migratedRoles.push({
				identity: entity.identity,
				roles: scopes,
				contextIds
			});
			SharedStore.set("migrationUserRoles", migratedRoles);
		}
	};
	SchemaMigrationFactory.register(
		`${nameof<AuthenticationUser>()}_0_1`,
		() => migrationV0V1 as ISchemaMigration
	);
}
