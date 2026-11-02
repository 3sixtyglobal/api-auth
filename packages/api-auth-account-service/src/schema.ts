// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { EntitySchemaFactory, EntitySchemaHelper } from "@3sixty/entity";
import { nameof } from "@3sixty/nameof";
import { AccountData } from "./entities/accountData.js";
import { Organization } from "./entities/organization.js";
import { OrganizationRequest } from "./entities/organizationRequest.js";

/**
 * Initialize the schema for the account data services.
 */
export function initSchema(): void {
	EntitySchemaFactory.register(nameof<AccountData>(), () =>
		EntitySchemaHelper.getSchema(AccountData)
	);
	EntitySchemaFactory.register(nameof<Organization>(), () =>
		EntitySchemaHelper.getSchema(Organization)
	);
	EntitySchemaFactory.register(nameof<OrganizationRequest>(), () =>
		EntitySchemaHelper.getSchema(OrganizationRequest)
	);
}
