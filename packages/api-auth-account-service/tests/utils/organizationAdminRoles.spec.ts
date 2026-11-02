// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { OrganizationAdminRoles } from "../../src/utils/organizationAdminRoles.js";
import { createRoleAuthorizationComponent } from "../helpers/testDependencies.js";

const MODEL_ID = "default";
const FIRST = "did:example:first";
const SECOND = "did:example:second";

describe("OrganizationAdminRoles", () => {
	it("should give the member admin role with an org admin role, once", async () => {
		const roles: { [subject: string]: string[] } = { "account-1": ["user"] };
		const adminRoles = new OrganizationAdminRoles(
			createRoleAuthorizationComponent(roles),
			MODEL_ID
		);

		await adminRoles.add("account-1", FIRST);
		await adminRoles.add("account-1", SECOND);

		expect(roles["account-1"]).toEqual([
			"user",
			`org-admin:${FIRST}`,
			"user-admin",
			`org-admin:${SECOND}`
		]);
	});

	it("should take the member admin role with the last org admin role only", async () => {
		const roles: { [subject: string]: string[] } = { "account-1": ["user"] };
		const adminRoles = new OrganizationAdminRoles(
			createRoleAuthorizationComponent(roles),
			MODEL_ID
		);
		await adminRoles.add("account-1", FIRST);
		await adminRoles.add("account-1", SECOND);

		await adminRoles.remove("account-1", FIRST);
		expect(roles["account-1"]).toEqual(["user", "user-admin", `org-admin:${SECOND}`]);

		await adminRoles.remove("account-1", SECOND);
		expect(roles["account-1"]).toEqual(["user"]);
	});

	it("should take the member admin role from every admin of a removed organization that has no other", async () => {
		const roles: { [subject: string]: string[] } = {
			"account-1": [`org-admin:${FIRST}`, "user-admin"],
			"account-2": [`org-admin:${FIRST}`, "user-admin", `org-admin:${SECOND}`]
		};
		const adminRoles = new OrganizationAdminRoles(
			createRoleAuthorizationComponent(roles),
			MODEL_ID
		);

		await adminRoles.removeAll(FIRST);

		expect(roles["account-1"]).toEqual([]);
		expect(roles["account-2"]).toEqual(["user-admin", `org-admin:${SECOND}`]);
	});

	it("should use the member admin role given", async () => {
		const roles: { [subject: string]: string[] } = { "account-1": [] };
		const adminRoles = new OrganizationAdminRoles(
			createRoleAuthorizationComponent(roles),
			MODEL_ID,
			undefined,
			"member-admin"
		);

		await adminRoles.add("account-1", FIRST);
		expect(roles["account-1"]).toEqual([`org-admin:${FIRST}`, "member-admin"]);

		await adminRoles.remove("account-1", FIRST);
		expect(roles["account-1"]).toEqual([]);
	});
});
