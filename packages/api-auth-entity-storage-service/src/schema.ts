// Copyright 2024 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { RandomHelper } from "@3sixty/core";
import { EntitySchemaFactory, EntitySchemaHelper } from "@3sixty/entity";
import { SchemaMigrationFactory, type ISchemaMigration } from "@3sixty/entity-storage-models";
import { nameof } from "@3sixty/nameof";
import { AuthenticationUser } from "./entities/authenticationUser.js";
import { AuthenticationUserV0 } from "./entities/authenticationUserV0.js";
import { AuthenticationUserV1 } from "./entities/authenticationUserV1.js";

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
	EntitySchemaFactory.register(nameof<AuthenticationUserV1>(), () =>
		EntitySchemaHelper.getSchema(AuthenticationUserV1)
	);

	// A stored account has an identity and no account id. The id is new, so the row cannot supply it.
	const allocateAccountId: ISchemaMigration<AuthenticationUserV1 & { userId?: string }> = {
		transformEntity: entity => ({
			...entity,
			userId: RandomHelper.generateUuidV7()
		})
	};
	SchemaMigrationFactory.register(
		`${nameof<AuthenticationUser>()}_1_2`,
		() => allocateAccountId as ISchemaMigration
	);
}
