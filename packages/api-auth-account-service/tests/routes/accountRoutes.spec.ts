// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { HttpContextIdKeys, type IHttpRequestContext } from "@3sixty/api-models";
import { ContextIdStore } from "@3sixty/context";
import { ComponentFactory } from "@3sixty/core";
import { MemoryEntityStorageConnector } from "@3sixty/entity-storage-connector-memory";
import {
	EntityStorageConnectorFactory,
	type IEntityStorageConnector
} from "@3sixty/entity-storage-models";
import { nameof } from "@3sixty/nameof";
import { HeaderTypes, HttpStatusCode } from "@3sixty/web";
import type { AccountData } from "../../src/entities/accountData.js";
import type { OrganizationRequest } from "../../src/entities/organizationRequest.js";
import {
	authenticationAccountAdminAddRole,
	authenticationAccountAdminAssignableRoles,
	authenticationAccountAdminCreate,
	authenticationAccountAdminCreateIdentity,
	authenticationAccountAdminExportIdentity,
	authenticationAccountAdminExportProfile,
	authenticationAccountAdminGetRoles,
	authenticationAccountAdminImportIdentity,
	authenticationAccountAdminImportProfile,
	authenticationAccountAdminManaged,
	authenticationAccountAdminQuery,
	authenticationAccountAdminRemoveRole,
	authenticationAccountAdminUpdate,
	generateRestRoutesAuthenticationAccountAdmin
} from "../../src/routes/entityStorageAuthenticationAccountAdminRoutes.js";
import {
	authenticationAccountAdoptIdentity,
	authenticationAccountCreate,
	authenticationAccountCreateOrganization,
	authenticationAccountExportIdentity,
	authenticationAccountExportProfile,
	authenticationAccountGet,
	authenticationAccountGetOrganization,
	authenticationAccountCancelOrganizationRequest,
	authenticationAccountGetOrganizationRequest,
	authenticationAccountImportIdentity,
	authenticationAccountImportProfile,
	authenticationAccountJoinOrganization,
	authenticationAccountLeaveOrganization,
	authenticationAccountPublicAccount,
	authenticationAccountPublicIdentity,
	authenticationAccountQuery,
	authenticationAccountRemove,
	authenticationAccountRemoveIdentity,
	authenticationAccountUpdate,
	generateRestRoutesAuthenticationAccount
} from "../../src/routes/entityStorageAuthenticationAccountRoutes.js";
import { generateRestRoutesIdentityProfileDeprecated } from "../../src/routes/identityProfileDeprecatedRoutes.js";
import { initSchema } from "../../src/schema.js";
import { EntityStorageAuthenticationAccountAdminService } from "../../src/services/entityStorageAuthenticationAccountAdminService.js";
import { identityData, organizationData } from "../helpers/accountDataValues.js";
import { createFakeIdentityComponent } from "../helpers/fakeIdentityComponent.js";
import {
	createAuthorizationComponent,
	createOrganizationStorage,
	createRateComponent
} from "../helpers/testDependencies.js";

initSchema();

const CONTEXT = {
	serverRequest: { headers: {} },
	processorState: {}
} as unknown as IHttpRequestContext;

describe("account routes", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[HttpContextIdKeys.PublicOrigin]: "https://node.example.com"
		});
	});

	it("should generate the account routes without a role check", () => {
		const routes = generateRestRoutesAuthenticationAccount("authentication/account", "account");

		expect(routes.map(r => [r.method, r.path, r.requiresAuthorization, r.skipAuth])).toEqual([
			["POST", "authentication/account/identity", false, undefined],
			["POST", "authentication/account/identity/export", false, undefined],
			["POST", "authentication/account/identity/import", false, undefined],
			["DELETE", "authentication/account/identity", false, undefined],
			["GET", "authentication/account/export", false, undefined],
			["POST", "authentication/account/import", false, undefined],
			["GET", "authentication/account/organization", false, undefined],
			["GET", "authentication/account/organization/request", false, undefined],
			["DELETE", "authentication/account/organization/request", false, undefined],
			["POST", "authentication/account/organization", false, undefined],
			["POST", "authentication/account/organization/create", false, undefined],
			["DELETE", "authentication/account/organization/:organization", false, undefined],
			["GET", "authentication/account/public/identity/:identity", undefined, true],
			["GET", "authentication/account/public/account/:accountId", false, undefined],
			["POST", "authentication/account", false, undefined],
			["GET", "authentication/account/:id", false, undefined],
			["PUT", "authentication/account/:id", false, undefined],
			["DELETE", "authentication/account/:id", false, undefined],
			["GET", "authentication/account", false, undefined]
		]);
		// Every signed in account manages its own data with the default user role, so no route
		// carries an admin only authorization.
		expect(routes.every(r => r.defaultAuthorization === undefined)).toBe(true);
	});

	it("should pass the self-service export and import requests to the component", async () => {
		const exported = {
			type: "account-identity" as const,
			version: 1,
			identity: {
				version: 1,
				namespace: "entity-storage",
				selfControlled: true,
				document: { id: "did:entity-storage:0x1" },
				keys: []
			},
			credentials: ["jwt"]
		};
		const profile = {
			type: "account-profile" as const,
			version: 1,
			items: [{ type: "profile", data: { name: "A" } }]
		};
		const component = {
			className: () => "account",
			exportIdentity: vi.fn().mockResolvedValue(exported),
			importIdentity: vi.fn().mockResolvedValue({ identity: "did:entity-storage:0x1" }),
			removeIdentity: vi.fn().mockResolvedValue(undefined),
			leaveOrganization: vi.fn().mockResolvedValue(undefined),
			exportProfile: vi.fn().mockResolvedValue(profile),
			importProfile: vi.fn().mockResolvedValue({ itemsImported: 1 })
		};
		vi.spyOn(ComponentFactory, "get").mockReturnValue(component);
		const context = {
			serverRequest: { headers: {} },
			processorState: { authSessionStart: 1767225600 }
		} as unknown as IHttpRequestContext;

		await expect(authenticationAccountExportIdentity(context, "account")).resolves.toEqual({
			headers: { [HeaderTypes.CacheControl]: "no-store" },
			body: exported
		});
		expect(component.exportIdentity).toHaveBeenCalledWith(1767225600);

		await authenticationAccountExportIdentity(CONTEXT, "account");
		expect(component.exportIdentity).toHaveBeenLastCalledWith(undefined);

		await expect(
			authenticationAccountImportIdentity(CONTEXT, "account", {} as never)
		).rejects.toMatchObject({ name: "GuardError" });
		await expect(
			authenticationAccountImportIdentity(CONTEXT, "account", { body: exported as never })
		).resolves.toEqual({ body: { identity: "did:entity-storage:0x1" } });
		expect(component.importIdentity).toHaveBeenCalledWith(exported, undefined);
		await authenticationAccountImportIdentity(context, "account", { body: exported as never });
		expect(component.importIdentity).toHaveBeenLastCalledWith(exported, 1767225600);

		await expect(authenticationAccountRemoveIdentity(context, "account")).resolves.toEqual({
			statusCode: HttpStatusCode.noContent
		});
		expect(component.removeIdentity).toHaveBeenCalledWith(1767225600);

		await expect(
			authenticationAccountLeaveOrganization(CONTEXT, "account", {
				pathParams: { organization: "did:example:org" }
			})
		).resolves.toEqual({ statusCode: HttpStatusCode.noContent });
		expect(component.leaveOrganization).toHaveBeenCalledWith("did:example:org");

		await expect(authenticationAccountExportProfile(CONTEXT, "account")).resolves.toEqual({
			headers: { [HeaderTypes.CacheControl]: "no-store" },
			body: profile
		});
		await expect(
			authenticationAccountImportProfile(CONTEXT, "account", { body: profile })
		).resolves.toEqual({ body: { itemsImported: 1 } });
		expect(component.importProfile).toHaveBeenCalledWith(profile);
	});

	it("should generate the admin routes with the user admin permissions", () => {
		const routes = generateRestRoutesAuthenticationAccountAdmin(
			"authentication/admin/account",
			"accountAdmin"
		);

		expect(routes.map(r => [r.method, r.path, r.defaultAuthorization?.permission])).toEqual([
			["POST", "authentication/admin/account", "user-admin:write"],
			["POST", "authentication/admin/account/:accountId/identity", "user-admin:write"],
			["POST", "authentication/admin/account/:accountId/identity/export", "user-admin:write"],
			["POST", "authentication/admin/account/:accountId/identity/import", "user-admin:write"],
			["GET", "authentication/admin/account/:accountId/export", "user-admin:read"],
			["POST", "authentication/admin/account/:accountId/import", "user-admin:write"],
			["GET", "authentication/admin/account/managed", "user-admin:read"],
			["GET", "authentication/admin/account/roles/assignable", "user-admin:read"],
			["GET", "authentication/admin/account/:accountId/roles", "user-admin:read"],
			["PUT", "authentication/admin/account/:accountId/roles/:role", "user-admin:write"],
			["DELETE", "authentication/admin/account/:accountId/roles/:role", "user-admin:write"],
			["GET", "authentication/admin/account/:id", "user-admin:read"],
			["PUT", "authentication/admin/account/:id", "user-admin:write"],
			["DELETE", "authentication/admin/account/:id", "user-admin:write"],
			["GET", "authentication/admin/account", "user-admin:read"]
		]);
	});

	it("should pass account admin exports and imports to the component, never caching an export", async () => {
		const identityFile = { type: "account-identity", version: 1, identity: {} } as never;
		const profileFile = { type: "account-profile", version: 1, items: [] } as never;
		const component = {
			className: () => "accountAdmin",
			createIdentity: vi.fn().mockResolvedValue("did:example:new"),
			exportIdentity: vi.fn().mockResolvedValue(identityFile),
			importIdentity: vi.fn().mockResolvedValue({ identity: "did:example:1" }),
			exportProfile: vi.fn().mockResolvedValue(profileFile),
			importProfile: vi.fn().mockResolvedValue({ itemsImported: 0 })
		};
		vi.spyOn(ComponentFactory, "get").mockReturnValue(component);
		const pathParams = { accountId: "account-1" };

		await expect(
			authenticationAccountAdminCreateIdentity(CONTEXT, "accountAdmin", { pathParams })
		).resolves.toEqual({ body: { identity: "did:example:new" } });
		expect(component.createIdentity).toHaveBeenCalledWith("account-1");

		await expect(
			authenticationAccountAdminExportIdentity(
				{
					serverRequest: { headers: {} },
					processorState: { authSessionStart: 1767225600 }
				} as unknown as IHttpRequestContext,
				"accountAdmin",
				{ pathParams }
			)
		).resolves.toEqual({
			headers: { [HeaderTypes.CacheControl]: "no-store" },
			body: identityFile
		});
		expect(component.exportIdentity).toHaveBeenCalledWith("account-1", 1767225600);

		await expect(
			authenticationAccountAdminExportProfile(CONTEXT, "accountAdmin", { pathParams })
		).resolves.toEqual({
			headers: { [HeaderTypes.CacheControl]: "no-store" },
			body: profileFile
		});

		await expect(
			authenticationAccountAdminImportIdentity(CONTEXT, "accountAdmin", {
				pathParams,
				body: identityFile
			})
		).resolves.toEqual({ body: { identity: "did:example:1" } });
		expect(component.importIdentity).toHaveBeenCalledWith("account-1", identityFile);

		await expect(
			authenticationAccountAdminImportProfile(CONTEXT, "accountAdmin", {
				pathParams,
				body: profileFile
			})
		).resolves.toEqual({ body: { itemsImported: 0 } });
		expect(component.importProfile).toHaveBeenCalledWith("account-1", profileFile);

		// A JSON body is required, so a cross-site form post cannot import.
		await expect(
			authenticationAccountAdminImportIdentity(CONTEXT, "accountAdmin", { pathParams } as never)
		).rejects.toMatchObject({ name: "GuardError" });
	});

	it("should answer not found for an unknown account on the admin routes that take one", async () => {
		const routes = generateRestRoutesAuthenticationAccountAdmin(
			"authentication/admin/account",
			"accountAdmin"
		);
		for (const route of routes.filter(r => r.path.includes(":accountId"))) {
			expect(route.responseType?.map(r => r.type)).toContain("INotFoundResponse");
		}

		const accountData = new MemoryEntityStorageConnector<AccountData>({
			entitySchema: nameof<AccountData>(),
			config: { storageKey: "account-data-routes" }
		});
		const userStorage = {
			className: () => "user",
			query: vi.fn().mockResolvedValue({ entities: [] })
		} as unknown as IEntityStorageConnector;
		const requests = new MemoryEntityStorageConnector<OrganizationRequest>({
			entitySchema: nameof<OrganizationRequest>(),
			config: { storageKey: "organization-request-routes" }
		});
		const organizations = await createOrganizationStorage("organization-routes");
		const identityComponent = createFakeIdentityComponent();
		const authorization = createAuthorizationComponent();
		EntityStorageConnectorFactory.register("account-data", () => accountData);
		EntityStorageConnectorFactory.register("authentication-user", () => userStorage);
		EntityStorageConnectorFactory.register("organization-request", () => requests);
		EntityStorageConnectorFactory.register("organization", () => organizations);
		ComponentFactory.register("identity-service", () => identityComponent);
		ComponentFactory.register("authorization", () => authorization);
		ComponentFactory.register("authentication-rate", () => createRateComponent());
		ComponentFactory.register(
			"accountAdmin",
			() => new EntityStorageAuthenticationAccountAdminService()
		);
		try {
			await expect(
				authenticationAccountAdminExportProfile(CONTEXT, "accountAdmin", {
					pathParams: { accountId: "account-missing" }
				})
			).rejects.toMatchObject({
				name: "NotFoundError",
				source: "EntityStorageAuthenticationAccountAdminService",
				message: "entityStorageAuthenticationAccountAdminService.userNotFound",
				properties: { notFoundId: "account-missing" }
			});
		} finally {
			ComponentFactory.unregister("accountAdmin");
			ComponentFactory.unregister("identity-service");
			ComponentFactory.unregister("authorization");
			ComponentFactory.unregister("authentication-rate");
			EntityStorageConnectorFactory.unregister("authentication-user");
			EntityStorageConnectorFactory.unregister("account-data");
			EntityStorageConnectorFactory.unregister("organization-request");
			EntityStorageConnectorFactory.unregister("organization");
			await accountData.teardown();
			await requests.teardown();
			await organizations.teardown();
		}
	});

	it("should pass account requests to the component", async () => {
		const component = {
			className: () => "account",
			adoptIdentity: vi.fn().mockResolvedValue("did:example:1"),
			joinOrganization: vi.fn().mockResolvedValue(undefined),
			getOrganization: vi.fn().mockResolvedValue("did:example:org"),
			getOrganizationRequest: vi.fn().mockResolvedValue({ id: "request-1", status: "pending" }),
			cancelOrganizationRequest: vi.fn().mockResolvedValue(undefined),
			create: vi.fn().mockResolvedValue("item-1"),
			get: vi.fn().mockResolvedValue({ id: "item-1" }),
			update: vi.fn().mockResolvedValue(undefined),
			remove: vi.fn().mockResolvedValue(undefined),
			query: vi.fn().mockResolvedValue({ entities: [], cursor: "next" })
		};
		vi.spyOn(ComponentFactory, "get").mockReturnValue(component);

		// A JSON body is required, so a cross-site form post cannot adopt an identity.
		await expect(
			authenticationAccountAdoptIdentity(CONTEXT, "account", {} as never)
		).rejects.toMatchObject({ name: "GuardError" });
		expect(component.adoptIdentity).not.toHaveBeenCalled();

		await expect(
			authenticationAccountAdoptIdentity(CONTEXT, "account", { body: {} })
		).resolves.toEqual({
			body: { identity: "did:example:1" }
		});
		expect(component.adoptIdentity).toHaveBeenCalledWith(undefined, undefined, undefined);

		// The session start is read from the token of the request.
		const proof = { type: "DataIntegrityProof", verificationMethod: "did:example:2#key-1" };
		await authenticationAccountAdoptIdentity(
			{
				serverRequest: { headers: {} },
				processorState: { authSessionStart: 1767225600 }
			} as unknown as IHttpRequestContext,
			"account",
			{ body: { identity: "did:example:2", proof: proof as never } }
		);
		expect(component.adoptIdentity).toHaveBeenCalledWith("did:example:2", proof, 1767225600);

		await expect(
			authenticationAccountJoinOrganization(CONTEXT, "account", {
				body: { organization: "did:example:org" }
			})
		).resolves.toEqual({ statusCode: HttpStatusCode.noContent });
		expect(component.joinOrganization).toHaveBeenCalledWith("did:example:org");

		await expect(authenticationAccountGetOrganization(CONTEXT, "account")).resolves.toEqual({
			body: { organization: "did:example:org" }
		});
		await expect(authenticationAccountGetOrganizationRequest(CONTEXT, "account")).resolves.toEqual({
			body: { request: { id: "request-1", status: "pending" } }
		});
		await expect(
			authenticationAccountCancelOrganizationRequest(CONTEXT, "account")
		).resolves.toEqual({ statusCode: HttpStatusCode.noContent });
		expect(component.cancelOrganizationRequest).toHaveBeenCalled();

		const created = await authenticationAccountCreate(
			CONTEXT,
			"account",
			{ body: { type: "profile", data: { name: "Alice" } } },
			"authentication/account"
		);
		expect(component.create).toHaveBeenCalledWith("profile", { name: "Alice" }, undefined);
		expect(created.statusCode).toBe(HttpStatusCode.created);
		expect(created.headers?.[HeaderTypes.Location]).toBe(
			"https://node.example.com/authentication/account/item-1"
		);

		await expect(
			authenticationAccountGet(CONTEXT, "account", { pathParams: { id: "item-1" } })
		).resolves.toEqual({ body: { id: "item-1" } });

		await authenticationAccountUpdate(CONTEXT, "account", {
			pathParams: { id: "item-1" },
			body: { data: { name: "Alice" }, isDefault: true }
		});
		expect(component.update).toHaveBeenCalledWith("item-1", { name: "Alice" }, true);

		await authenticationAccountRemove(CONTEXT, "account", { pathParams: { id: "item-1" } });
		expect(component.remove).toHaveBeenCalledWith("item-1");

		await expect(
			authenticationAccountQuery(CONTEXT, "account", {
				query: { type: "vc", cursor: "c1", limit: "5" }
			})
		).resolves.toEqual({ body: { entities: [], cursor: "next" } });
		expect(component.query).toHaveBeenCalledWith("vc", "c1", 5);
	});

	it("should pass admin requests to the component", async () => {
		const component = {
			className: () => "accountAdmin",
			create: vi.fn().mockResolvedValue("item-1"),
			query: vi.fn().mockResolvedValue({ entities: [] })
		};
		vi.spyOn(ComponentFactory, "get").mockReturnValue(component);

		await authenticationAccountAdminCreate(
			CONTEXT,
			"accountAdmin",
			{
				body: {
					accountId: "account-1",
					type: "organization",
					data: organizationData("did:example:org"),
					isDefault: true
				}
			},
			"authentication/admin/account"
		);
		expect(component.create).toHaveBeenCalledWith(
			"account-1",
			"organization",
			organizationData("did:example:org"),
			true,
			undefined,
			undefined
		);

		const proof = { type: "DataIntegrityProof", verificationMethod: "did:example:2#key-1" };
		await authenticationAccountAdminCreate(
			CONTEXT,
			"accountAdmin",
			{
				body: {
					accountId: "account-1",
					type: "identity",
					data: identityData("did:example:2"),
					proof: proof as never
				}
			},
			"authentication/admin/account"
		);
		expect(component.create).toHaveBeenLastCalledWith(
			"account-1",
			"identity",
			identityData("did:example:2"),
			undefined,
			proof,
			undefined
		);

		await authenticationAccountAdminQuery(CONTEXT, "accountAdmin", {
			query: { accountId: "account-1", type: "identity" }
		});
		expect(component.query).toHaveBeenCalledWith("account-1", "identity", undefined, undefined);
	});

	it("should pass the admin only flag, and the managed accounts, through the admin routes", async () => {
		const component = {
			className: () => "accountAdmin",
			create: vi.fn().mockResolvedValue("item-1"),
			update: vi.fn().mockResolvedValue(undefined),
			getManagedAccounts: vi.fn().mockResolvedValue(["account-1"])
		};
		vi.spyOn(ComponentFactory, "get").mockReturnValue(component);

		await authenticationAccountAdminCreate(
			CONTEXT,
			"accountAdmin",
			{ body: { accountId: "account-1", type: "note", data: { a: 1 }, adminOnly: true } },
			"authentication/admin/account"
		);
		expect(component.create).toHaveBeenCalledWith(
			"account-1",
			"note",
			{ a: 1 },
			undefined,
			undefined,
			true
		);
		await authenticationAccountAdminUpdate(CONTEXT, "accountAdmin", {
			pathParams: { id: "item-1" },
			body: { data: { a: 2 }, adminOnly: false }
		});
		expect(component.update).toHaveBeenCalledWith("item-1", { a: 2 }, undefined, false);
		await expect(authenticationAccountAdminManaged(CONTEXT, "accountAdmin")).resolves.toEqual({
			body: { accountIds: ["account-1"] }
		});
	});

	it("should pass the role requests through the admin routes", async () => {
		const component = {
			className: () => "accountAdmin",
			getRoles: vi.fn().mockResolvedValue(["user"]),
			getAssignableRoles: vi.fn().mockResolvedValue(["user", "user-admin"]),
			addRole: vi.fn().mockResolvedValue(undefined),
			removeRole: vi.fn().mockResolvedValue(undefined)
		};
		vi.spyOn(ComponentFactory, "get").mockReturnValue(component);

		await expect(
			authenticationAccountAdminAssignableRoles(CONTEXT, "accountAdmin")
		).resolves.toEqual({ body: { roles: ["user", "user-admin"] } });
		await expect(
			authenticationAccountAdminGetRoles(CONTEXT, "accountAdmin", {
				pathParams: { accountId: "account-1" }
			})
		).resolves.toEqual({ body: { roles: ["user"] } });
		await expect(
			authenticationAccountAdminAddRole(CONTEXT, "accountAdmin", {
				pathParams: { accountId: "account-1", role: "user-admin" }
			})
		).resolves.toEqual({ statusCode: HttpStatusCode.noContent });
		expect(component.addRole).toHaveBeenCalledWith("account-1", "user-admin");
		await expect(
			authenticationAccountAdminRemoveRole(CONTEXT, "accountAdmin", {
				pathParams: { accountId: "account-1", role: "user-admin" }
			})
		).resolves.toEqual({ statusCode: HttpStatusCode.noContent });
		expect(component.removeRole).toHaveBeenCalledWith("account-1", "user-admin");
		await expect(
			authenticationAccountAdminAddRole(CONTEXT, "accountAdmin", {} as never)
		).rejects.toMatchObject({ name: "GuardError" });
	});

	it("should pass the organization create and public data requests to the component", async () => {
		const organization = { id: "org-1", identity: "did:example:org", isAdmin: true };
		const objects = [{ "@type": "Organization", name: "Example Ltd" }];
		const component = {
			className: () => "account",
			createOrganization: vi.fn().mockResolvedValue(organization),
			getPublicDataByIdentity: vi.fn().mockResolvedValue(objects),
			getPublicDataByAccount: vi.fn().mockResolvedValue(objects)
		};
		vi.spyOn(ComponentFactory, "get").mockReturnValue(component);

		const created = await authenticationAccountCreateOrganization(
			CONTEXT,
			"account",
			{ body: { publicData: ["profile.name"] } },
			"authentication/account"
		);
		expect(created).toMatchObject({ statusCode: HttpStatusCode.created, body: organization });
		expect(created.headers.location).toContain("authentication/account/organization");
		expect(component.createOrganization).toHaveBeenCalledWith({ publicData: ["profile.name"] });

		await expect(
			authenticationAccountPublicIdentity(CONTEXT, "account", {
				pathParams: { identity: "did:example:org" }
			})
		).resolves.toEqual({ body: objects });
		expect(component.getPublicDataByIdentity).toHaveBeenCalledWith("did:example:org");
		await expect(
			authenticationAccountPublicAccount(CONTEXT, "account", { pathParams: { accountId: "a-1" } })
		).resolves.toEqual({ body: objects });
		expect(component.getPublicDataByAccount).toHaveBeenCalledWith("a-1");
		await expect(
			authenticationAccountPublicIdentity(CONTEXT, "account", {} as never)
		).rejects.toMatchObject({ name: "GuardError" });
	});
});

describe("identity profile deprecated routes", () => {
	it("should mirror the identity profile routes and refuse each with a notice", async () => {
		const routes = generateRestRoutesIdentityProfileDeprecated(
			"identity/profile",
			"identityProfile"
		);

		expect(routes.map(r => [r.method, r.path, r.skipAuth])).toEqual([
			["POST", "identity/profile/", true],
			["GET", "identity/profile/", true],
			["GET", "identity/profile/:userIdentity", true],
			["GET", "identity/profile/:identity/public", true],
			["PUT", "identity/profile/", true],
			["PUT", "identity/profile/:userIdentity", true],
			["DELETE", "identity/profile/", true],
			["DELETE", "identity/profile/:userIdentity", true],
			["GET", "identity/profile/query/", true],
			["GET", "identity/profile/admin/query/", true]
		]);
		for (const route of routes) {
			await expect(route.handler(CONTEXT, {})).rejects.toMatchObject({
				name: "NotImplementedError",
				properties: { method: "identityProfile", replacement: "/authentication/account" },
				cause: { message: "identityProfileDeprecatedRoutes.identityProfileDeprecated" }
			});
		}
	});
});
