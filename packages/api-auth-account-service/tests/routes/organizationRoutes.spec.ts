// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IHttpRequestContext } from "@3sixty/api-models";
import { ComponentFactory } from "@3sixty/core";
import { HeaderTypes, HttpStatusCode } from "@3sixty/web";
import {
	generateRestRoutesOrganization,
	organizationAdminAdd,
	organizationAdminRemove,
	organizationCreate,
	organizationExportIdentity,
	organizationGet,
	organizationMemberQuery,
	organizationQuery,
	organizationRemove,
	organizationSearch,
	organizationUpdate
} from "../../src/routes/entityStorageOrganizationRoutes.js";

const CONTEXT = {
	serverRequest: { headers: {} },
	processorState: {}
} as unknown as IHttpRequestContext;

describe("organization routes", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it("should keep management for admins and reading for any account", () => {
		const routes = generateRestRoutesOrganization("authentication/organization", "organization");

		expect(
			routes.map(r => [
				r.method,
				r.path,
				r.defaultAuthorization?.permission,
				r.defaultAuthorization?.role,
				r.requiresAuthorization
			])
		).toEqual([
			["POST", "authentication/organization", "organization-admin:write", "user-admin", undefined],
			["GET", "authentication/organization", "organization-admin:read", "user-admin", undefined],
			["GET", "authentication/organization/search", undefined, undefined, false],
			["GET", "authentication/organization/:id", undefined, undefined, false],
			["PUT", "authentication/organization/:id", undefined, undefined, false],
			["DELETE", "authentication/organization/:id", undefined, undefined, false],
			["GET", "authentication/organization/:id/member", undefined, undefined, false],
			["PUT", "authentication/organization/:id/admin/:accountId", undefined, undefined, false],
			["DELETE", "authentication/organization/:id/admin/:accountId", undefined, undefined, false],
			[
				"POST",
				"authentication/organization/:id/export",
				"organization-admin:write",
				"user-admin",
				undefined
			]
		]);
		expect(routes.every(r => r.skipAuth !== true)).toBe(true);
	});

	it("should pass requests to the component", async () => {
		const component = {
			className: () => "organization",
			create: vi.fn().mockResolvedValue({ id: "org-1", identity: "did:example:org" }),
			get: vi.fn().mockResolvedValue({ id: "org-1" }),
			query: vi.fn().mockResolvedValue({ entities: [], cursor: "next" }),
			search: vi.fn().mockResolvedValue({ entities: [] }),
			update: vi.fn().mockResolvedValue(undefined),
			remove: vi.fn().mockResolvedValue(undefined)
		};
		vi.spyOn(ComponentFactory, "get").mockReturnValue(component);

		const created = await organizationCreate(
			CONTEXT,
			"organization",
			{ body: { identity: "did:example:org" } },
			"authentication/organization"
		);
		expect(created.statusCode).toBe(HttpStatusCode.created);
		expect(created.headers.location).toContain("org-1");

		await expect(
			organizationGet(CONTEXT, "organization", { pathParams: { id: "org-1" } })
		).resolves.toEqual({ body: { id: "org-1" } });

		await expect(
			organizationQuery(CONTEXT, "organization", { query: { cursor: "c1", limit: "5" } })
		).resolves.toEqual({ body: { entities: [], cursor: "next" } });
		expect(component.query).toHaveBeenCalledWith("c1", 5);

		await expect(
			organizationSearch(CONTEXT, "organization", { query: { name: "exam", limit: "3" } })
		).resolves.toEqual({ body: { entities: [] } });
		expect(component.search).toHaveBeenCalledWith("exam", 3);

		const profile = { "@context": "https://schema.org", "@type": "Organization" };
		await expect(
			organizationUpdate(CONTEXT, "organization", {
				pathParams: { id: "org-1" },
				body: { profile, publicData: ["profile.name"] }
			})
		).resolves.toEqual({ statusCode: HttpStatusCode.noContent });
		expect(component.update).toHaveBeenCalledWith("org-1", {
			profile,
			publicData: ["profile.name"]
		});

		await expect(
			organizationRemove(CONTEXT, "organization", { pathParams: { id: "org-1" } })
		).resolves.toEqual({ statusCode: HttpStatusCode.noContent });
		expect(component.remove).toHaveBeenCalledWith("org-1");
	});

	it("should pass the member and org admin requests to the component", async () => {
		const component = {
			className: () => "organization",
			queryMembers: vi.fn().mockResolvedValue({ entities: [{ accountId: "a-1", isAdmin: true }] }),
			addAdmin: vi.fn().mockResolvedValue(undefined),
			removeAdmin: vi.fn().mockResolvedValue(undefined)
		};
		vi.spyOn(ComponentFactory, "get").mockReturnValue(component);

		await expect(
			organizationMemberQuery(CONTEXT, "organization", {
				pathParams: { id: "org-1" },
				query: { cursor: "c1", limit: "5" }
			})
		).resolves.toEqual({ body: { entities: [{ accountId: "a-1", isAdmin: true }] } });
		expect(component.queryMembers).toHaveBeenCalledWith("org-1", "c1", 5);
		await expect(
			organizationAdminAdd(CONTEXT, "organization", {
				pathParams: { id: "org-1", accountId: "a-2" }
			})
		).resolves.toEqual({ statusCode: HttpStatusCode.noContent });
		expect(component.addAdmin).toHaveBeenCalledWith("org-1", "a-2");
		await expect(
			organizationAdminRemove(CONTEXT, "organization", {
				pathParams: { id: "org-1", accountId: "a-2" }
			})
		).resolves.toEqual({ statusCode: HttpStatusCode.noContent });
		expect(component.removeAdmin).toHaveBeenCalledWith("org-1", "a-2");
		await expect(organizationAdminAdd(CONTEXT, "organization", {} as never)).rejects.toMatchObject({
			name: "GuardError"
		});
	});

	it("should export the identity of an organization with the session start and no caching", async () => {
		const identity = { version: 1, namespace: "entity-storage", document: { id: "did:x:1" } };
		const component = {
			className: () => "organization",
			exportIdentity: vi.fn().mockResolvedValue({ identity, nextRevocationIndex: 4 })
		};
		vi.spyOn(ComponentFactory, "get").mockReturnValue(component);

		await expect(
			organizationExportIdentity(
				{
					serverRequest: { headers: {} },
					processorState: { authSessionStart: 1767225600 }
				} as unknown as IHttpRequestContext,
				"organization",
				{ pathParams: { id: "org-1" } }
			)
		).resolves.toEqual({
			headers: { [HeaderTypes.CacheControl]: "no-store" },
			body: { identity, nextRevocationIndex: 4 }
		});
		expect(component.exportIdentity).toHaveBeenCalledWith("org-1", 1767225600);
	});
});
