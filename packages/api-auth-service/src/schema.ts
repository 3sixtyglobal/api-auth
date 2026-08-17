// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { EntitySchemaFactory, EntitySchemaHelper } from "@twin.org/entity";
import { nameof } from "@twin.org/nameof";
import { AuthenticationAuditEntry } from "./entities/authenticationAuditEntry.js";
import { AuthenticationRateEntry } from "./entities/authenticationRateEntry.js";

/**
 * Initialize the schema for the authentication service.
 */
export function initSchema(): void {
	EntitySchemaFactory.register(nameof<AuthenticationAuditEntry>(), () =>
		EntitySchemaHelper.getSchema(AuthenticationAuditEntry)
	);
	EntitySchemaFactory.register(nameof<AuthenticationRateEntry>(), () =>
		EntitySchemaHelper.getSchema(AuthenticationRateEntry)
	);
}
