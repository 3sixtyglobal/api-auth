// Copyright 2024 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { EntitySchemaFactory, EntitySchemaHelper } from "@3sixty/entity";
import { nameof } from "@3sixty/nameof";
import { AuthenticationPasswordReset } from "./entities/authenticationPasswordReset.js";
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
	EntitySchemaFactory.register(nameof<AuthenticationPasswordReset>(), () =>
		EntitySchemaHelper.getSchema(AuthenticationPasswordReset)
	);
	EntitySchemaFactory.register(nameof<AuthenticationUserV0>(), () =>
		EntitySchemaHelper.getSchema(AuthenticationUserV0)
	);
	EntitySchemaFactory.register(nameof<AuthenticationUserV1>(), () =>
		EntitySchemaHelper.getSchema(AuthenticationUserV1)
	);
}
