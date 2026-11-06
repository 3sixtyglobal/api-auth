// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { EntitySchemaFactory, EntitySchemaHelper } from "@3sixty/entity";
import { nameof } from "@3sixty/nameof";
import type { AuthenticationAuthorizationCode } from "../src/entities/authenticationAuthorizationCode.js";
import type { AuthenticationPasswordReset } from "../src/entities/authenticationPasswordReset.js";
import type { AuthenticationUser } from "../src/entities/authenticationUser.js";
import type { AuthenticationUserV1 } from "../src/entities/authenticationUserV1.js";
import { initSchema } from "../src/schema.js";

initSchema();

describe("initSchema", () => {
	test("registers the account schema with the account id and dates", () => {
		const schema = EntitySchemaFactory.get(nameof<AuthenticationUser>());

		expect(EntitySchemaHelper.getVersion(schema)).toBe(2);
		expect(schema.properties?.map(p => p.property)).toEqual([
			"accountId",
			"email",
			"password",
			"salt",
			"authProviderId",
			"providerAccountId",
			"providerTenantId",
			"passwordVersion",
			"dateCreated",
			"dateModified",
			"dateLastLogin",
			"dateDisabled",
			"verified",
			"passwordAlgorithm",
			"passwordHashParameters"
		]);
		expect(EntitySchemaHelper.findVersionProperty(schema)).toBeUndefined();
	});

	test("registers the password reset token schema", () => {
		const schema = EntitySchemaFactory.get(nameof<AuthenticationPasswordReset>());

		expect(schema.properties?.map(p => p.property)).toEqual([
			"id",
			"accountId",
			"expires",
			"dateCreated",
			"purpose",
			"password",
			"salt",
			"passwordAlgorithm",
			"passwordHashParameters",
			"used"
		]);
		expect(EntitySchemaHelper.findVersionProperty(schema)).toBeUndefined();
	});

	test("registers the authorization code schema", () => {
		const schema = EntitySchemaFactory.get(nameof<AuthenticationAuthorizationCode>());

		expect(schema.properties?.map(p => p.property)).toEqual([
			"id",
			"accountId",
			"redirectUri",
			"codeChallenge",
			"nonce",
			"expires",
			"dateCreated"
		]);
	});

	test("keeps the version 1 schema so the node can migrate it", () => {
		const schema = EntitySchemaFactory.get(nameof<AuthenticationUserV1>());

		expect(schema.properties?.map(p => p.property)).toContain("identity");
		expect(schema.properties?.map(p => p.property)).toContain("organization");
	});
});
