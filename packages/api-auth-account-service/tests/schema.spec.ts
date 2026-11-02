// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { EntitySchemaFactory } from "@3sixty/entity";
import { nameof } from "@3sixty/nameof";
import type { AccountData } from "../src/entities/accountData.js";
import type { Organization } from "../src/entities/organization.js";
import type { OrganizationRequest } from "../src/entities/organizationRequest.js";
import { initSchema } from "../src/schema.js";

describe("initSchema", () => {
	test("registers the account data, organization and organization request schemas", () => {
		initSchema();

		for (const name of [
			nameof<AccountData>(),
			nameof<Organization>(),
			nameof<OrganizationRequest>()
		]) {
			expect(EntitySchemaFactory.get(name).properties?.length).toBeGreaterThan(0);
		}
	});
});
