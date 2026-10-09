// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { EntitySchemaFactory, EntitySchemaHelper } from "@3sixty/entity";
import { nameof } from "@3sixty/nameof";
import { AuthenticationAuditEntry } from "./entities/authenticationAuditEntry.js";
import { AuthenticationRateEntry } from "./entities/authenticationRateEntry.js";
import { AuthenticationUser } from "./entities/authenticationUser.js";

/**
 * Initialize the schema for the authentication service.
 */
export function initSchema(): void {
	EntitySchemaFactory.register(nameof<AuthenticationUser>(), () =>
		EntitySchemaHelper.getSchema(AuthenticationUser)
	);
	EntitySchemaFactory.register(nameof<AuthenticationAuditEntry>(), () =>
		EntitySchemaHelper.getSchema(AuthenticationAuditEntry)
	);
	EntitySchemaFactory.register(nameof<AuthenticationRateEntry>(), () =>
		EntitySchemaHelper.getSchema(AuthenticationRateEntry)
	);
}
