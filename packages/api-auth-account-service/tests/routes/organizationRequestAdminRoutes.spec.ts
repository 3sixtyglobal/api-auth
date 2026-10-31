// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IHttpRequestContext } from "@3sixty/api-models";
import { ComponentFactory } from "@3sixty/core";
import { HttpStatusCode } from "@3sixty/web";
import {
	generateRestRoutesOrganizationRequestAdmin,
	organizationRequestAdminAccept,
	organizationRequestAdminCount,
	organizationRequestAdminGet,
	organizationRequestAdminQuery,
	organizationRequestAdminReject,
	organizationRequestAdminRemoveForAccount
} from "../../src/routes/entityStorageOrganizationRequestAdminRoutes.js";

const CONTEXT = {
	serverRequest: { headers: {} },
	processorState: {}
} as unknown as IHttpRequestContext;

describe("organization request admin routes", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it("should generate the routes with the user admin permissions", () => {
		const routes = generateRestRoutesOrganizationRequestAdmin(
			"authentication/admin/organization-request",
			"organizationRequestAdmin"
		);

		expect(routes.map(r => [r.method, r.path, r.defaultAuthorization?.permission])).toEqual([
			// Before the get, so count is never read as an id.
			["GET", "authentication/admin/organization-request/count", "user-admin:read"],
			["GET", "authentication/admin/organization-request/:id", "user-admin:read"],
			["GET", "authentication/admin/organization-request", "user-admin:read"],
			["POST", "authentication/admin/organization-request/:id/accept", "user-admin:write"],
			["POST", "authentication/admin/organization-request/:id/reject", "user-admin:write"],
			["DELETE", "authentication/admin/organization-request/account/:accountId", "user-admin:write"]
		]);
	});

	it("should pass requests to the component", async () => {
		const component = {
			className: () => "organizationRequestAdmin",
			get: vi.fn().mockResolvedValue({ id: "request-1" }),
			query: vi.fn().mockResolvedValue({ entities: [], cursor: "next" }),
			countRequests: vi.fn().mockResolvedValue({ count: 4, capped: false }),
			accept: vi.fn().mockResolvedValue(undefined),
			reject: vi.fn().mockResolvedValue(undefined),
			removeForAccount: vi.fn().mockResolvedValue(undefined)
		};
		vi.spyOn(ComponentFactory, "get").mockReturnValue(component);

		await expect(
			organizationRequestAdminGet(CONTEXT, "organizationRequestAdmin", {
				pathParams: { id: "request-1" }
			})
		).resolves.toEqual({ body: { id: "request-1" } });

		await expect(
			organizationRequestAdminQuery(CONTEXT, "organizationRequestAdmin", {
				query: {
					status: "pending",
					filterOrganization: "did:example:org",
					cursor: "c1",
					limit: "5"
				}
			})
		).resolves.toEqual({ body: { entities: [], cursor: "next" } });
		expect(component.query).toHaveBeenCalledWith("pending", "did:example:org", "c1", 5);

		await expect(
			organizationRequestAdminCount(CONTEXT, "organizationRequestAdmin", {
				query: { status: "pending", filterOrganization: "did:example:org" }
			})
		).resolves.toEqual({ body: { count: 4, capped: false } });
		expect(component.countRequests).toHaveBeenCalledWith("pending", "did:example:org");
		await expect(
			organizationRequestAdminCount(CONTEXT, "organizationRequestAdmin", {} as never)
		).rejects.toMatchObject({ name: "GuardError" });

		await expect(
			organizationRequestAdminAccept(CONTEXT, "organizationRequestAdmin", {
				pathParams: { id: "request-1" }
			})
		).resolves.toEqual({ statusCode: HttpStatusCode.noContent });
		expect(component.accept).toHaveBeenCalledWith("request-1");

		await organizationRequestAdminReject(CONTEXT, "organizationRequestAdmin", {
			pathParams: { id: "request-1" },
			body: { reason: "organizationRequest.reason.unknown" }
		});
		expect(component.reject).toHaveBeenCalledWith(
			"request-1",
			"organizationRequest.reason.unknown"
		);

		await expect(
			organizationRequestAdminRemoveForAccount(CONTEXT, "organizationRequestAdmin", {
				pathParams: { accountId: "account-1" }
			})
		).resolves.toEqual({ statusCode: HttpStatusCode.noContent });
		expect(component.removeForAccount).toHaveBeenCalledWith("account-1");
	});
});
