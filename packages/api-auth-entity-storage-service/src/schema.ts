// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { EntitySchemaFactory, EntitySchemaHelper } from "@twin.org/entity";
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
}
