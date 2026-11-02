// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuthorizationComponent } from "@3sixty/authorization-models";
import { ContextIdKeys, ContextIdStore } from "@3sixty/context";
import { ComponentFactory } from "@3sixty/core";
import { MemoryEntityStorageConnector } from "@3sixty/entity-storage-connector-memory";
import {
	EntityStorageConnectorFactory,
	type IEntityStorageConnector
} from "@3sixty/entity-storage-models";
import { nameof } from "@3sixty/nameof";
import type { AccountData } from "../../src/entities/accountData.js";
import type { Organization } from "../../src/entities/organization.js";
import type { OrganizationRequest } from "../../src/entities/organizationRequest.js";
import { initSchema } from "../../src/schema.js";
import { EntityStorageAuthenticationAccountAdminService } from "../../src/services/entityStorageAuthenticationAccountAdminService.js";
import { AccountDataHelper } from "../../src/utils/accountDataHelper.js";
import { organizationData } from "../helpers/accountDataValues.js";
import { createFakeIdentityComponent } from "../helpers/fakeIdentityComponent.js";
import {
	createRateComponent,
	createRoleAuthorizationComponent,
	createUserStorage
} from "../helpers/testDependencies.js";

initSchema();

const ORGANIZATION = "did:example:organization";

/**
 * Run a function as a signed in account, or as the system when no account is given.
 * @param accountId The account id.
 * @param fn The function to run.
 * @returns The result of the function.
 */
async function run<T>(accountId: string | undefined, fn: () => Promise<T>): Promise<T> {
	return ContextIdStore.run(
		{ [ContextIdKeys.Node]: "did:example:node", [ContextIdKeys.Account]: accountId },
		fn
	);
}

describe("EntityStorageAuthenticationAccountAdminService roles", () => {
	let accountData: MemoryEntityStorageConnector<AccountData>;
	let roles: { [subject: string]: string[] };
	let authorization: IAuthorizationComponent;
	let admin: EntityStorageAuthenticationAccountAdminService;

	beforeEach(async () => {
		accountData = new MemoryEntityStorageConnector<AccountData>({
			entitySchema: nameof<AccountData>(),
			config: { storageKey: "account-data-roles" }
		});
		const organizations = new MemoryEntityStorageConnector<Organization>({
			entitySchema: nameof<Organization>(),
			config: { storageKey: "organization-roles" }
		});
		const requests = new MemoryEntityStorageConnector<OrganizationRequest>({
			entitySchema: nameof<OrganizationRequest>(),
			config: { storageKey: "organization-request-roles" }
		});
		EntityStorageConnectorFactory.register("account-data", () => accountData);
		EntityStorageConnectorFactory.register("organization", () => organizations);
		EntityStorageConnectorFactory.register("organization-request", () => requests);
		const userStorage = createUserStorage();
		EntityStorageConnectorFactory.register("authentication-user", () => userStorage);
		roles = {
			"global-1": ["global-admin"],
			"scoped-admin": ["user", "user-admin", "devops", `org-admin:${ORGANIZATION}`],
			"member-1": ["user"],
			"escalated-member": ["global-admin"]
		};
		authorization = createRoleAuthorizationComponent(roles);
		const identityComponent = createFakeIdentityComponent();
		const rate = createRateComponent();
		ComponentFactory.register("identity-service", () => identityComponent);
		ComponentFactory.register("authentication-rate", () => rate);
		ComponentFactory.register("authorization", () => authorization);
		admin = new EntityStorageAuthenticationAccountAdminService({
			config: { assignableRoles: ["user-admin", "tenant-admin"] }
		});
		for (const accountId of ["scoped-admin", "member-1", "escalated-member"]) {
			await AccountDataHelper.create(
				accountData,
				accountId,
				"organization",
				organizationData(ORGANIZATION),
				true
			);
		}
	});

	afterEach(async () => {
		ComponentFactory.unregister("identity-service");
		ComponentFactory.unregister("authentication-rate");
		ComponentFactory.unregister("authorization");
		EntityStorageConnectorFactory.unregister("account-data");
		EntityStorageConnectorFactory.unregister("organization");
		EntityStorageConnectorFactory.unregister("organization-request");
		EntityStorageConnectorFactory.unregister("authentication-user");
		await accountData.teardown();
	});

	it("should let a global admin grant and revoke any role, including global-admin and tenant-admin", async () => {
		await run("global-1", async () => {
			const assignable = await admin.getAssignableRoles();
			// The configured roles are included before any account holds them, org admin roles never.
			expect(assignable).toEqual(["devops", "global-admin", "tenant-admin", "user", "user-admin"]);

			await admin.addRole("outsider", "tenant-admin");
			await admin.addRole("member-1", "global-admin");
			await expect(admin.getRoles("member-1")).resolves.toEqual(["user", "global-admin"]);
			await admin.removeRole("member-1", "global-admin");
			await expect(admin.getRoles("outsider")).resolves.toEqual(["tenant-admin"]);
		});
		// The authorization component is called in the context of the caller, not as the system.
		expect(authorization.addRoleForSubject).toHaveBeenCalledWith(
			"system",
			"outsider",
			"tenant-admin"
		);
	});

	it("should refuse a global admin a role change for an account that does not exist", async () => {
		const users =
			EntityStorageConnectorFactory.get<IEntityStorageConnector<{ accountId: string }>>(
				"authentication-user"
			);
		vi.mocked(users.query).mockResolvedValue({ entities: [] });
		await run("global-1", async () => {
			for (const attempt of [
				async () => admin.addRole("no-such-account", "user-admin"),
				async () => admin.removeRole("no-such-account", "user-admin")
			]) {
				await expect(attempt()).rejects.toMatchObject({
					name: "NotFoundError",
					message: "entityStorageAuthenticationAccountAdminService.userNotFound"
				});
			}
		});
		expect(roles["no-such-account"]).toBeUndefined();
	});

	it("should refuse to revoke global-admin from its last holder", async () => {
		roles["escalated-member"] = [];
		await expect(
			run("global-1", async () => admin.removeRole("global-1", "global-admin"))
		).rejects.toMatchObject({
			name: "ConflictError",
			message: "entityStorageAuthenticationAccountAdminService.lastEscalatedRoleHolder"
		});
		expect(roles["global-1"]).toEqual(["global-admin"]);
	});

	it("should let a scoped user admin grant only the assignable roles it holds, to the members it manages", async () => {
		await run("scoped-admin", async () => {
			// devops is held but not assignable, so it is not passed on.
			await expect(admin.getAssignableRoles()).resolves.toEqual(["user-admin"]);
			await admin.addRole("member-1", "user-admin");
			await expect(admin.getRoles("member-1")).resolves.toEqual(["user", "user-admin"]);
			await admin.removeRole("member-1", "user-admin");

			for (const role of ["tenant-admin", "global-admin", "devops", "user"]) {
				await expect(admin.addRole("member-1", role)).rejects.toMatchObject({
					name: "ForbiddenError",
					message: "entityStorageAuthenticationAccountAdminService.roleNotAssignable"
				});
			}
			await expect(admin.addRole("scoped-admin", "user")).rejects.toMatchObject({
				name: "ForbiddenError",
				message: "entityStorageAuthenticationAccountAdminService.ownRolesNotPermitted"
			});
			await expect(admin.addRole("escalated-member", "user")).rejects.toMatchObject({
				name: "ForbiddenError",
				message: "entityStorageAuthenticationAccountAdminService.insufficientRoleForEscalatedTarget"
			});
			for (const attempt of [
				async () => admin.addRole("outsider", "user"),
				async () => admin.removeRole("outsider", "user"),
				async () => admin.getRoles("outsider")
			]) {
				await expect(attempt()).rejects.toMatchObject({
					name: "NotFoundError",
					message: "entityStorageAuthenticationAccountAdminService.userNotFound"
				});
			}
			await expect(admin.addRole("member-1", `org-admin:${ORGANIZATION}`)).rejects.toMatchObject({
				name: "UnprocessableError",
				message: "entityStorageAuthenticationAccountAdminService.organizationAdminRoleManaged"
			});
		});
		expect(roles["member-1"]).toEqual(["user"]);
		expect(roles.outsider).toBeUndefined();
	});
});
