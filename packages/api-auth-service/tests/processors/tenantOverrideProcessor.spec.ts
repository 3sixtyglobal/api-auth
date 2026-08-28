// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import {
	ForbiddenError,
	HttpContextIdKeys,
	type IHttpResponse,
	type IHttpServerRequest,
	type ITenantAdminComponent
} from "@twin.org/api-models";
import type { IAuthorizationComponent } from "@twin.org/authorization-models";
import { ContextIdKeys, type IContextIds } from "@twin.org/context";
import { ComponentFactory } from "@twin.org/core";
import { HttpStatusCode } from "@twin.org/web";
import { TenantOverrideProcessor } from "../../src/processors/tenantOverrideProcessor.js";

const CALLER_TENANT = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6";
const CALLER_USER = "user-001";
const OVERRIDE_TENANT = "b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7";
const INVALID_TENANT = "not-a-valid-tenant-id";

describe("TenantOverrideProcessor", () => {
	let mockTenantAdminComponent: ITenantAdminComponent;
	let mockAuthorizationComponent: IAuthorizationComponent;
	// Untyped reference so mockResolvedValue(undefined) needs no cast.
	let getTenantMock: ReturnType<typeof vi.fn>;
	let processor: TenantOverrideProcessor;

	beforeEach(() => {
		vi.restoreAllMocks();

		getTenantMock = vi.fn().mockResolvedValue({ id: OVERRIDE_TENANT });

		mockTenantAdminComponent = {
			get: getTenantMock
		} as unknown as ITenantAdminComponent;

		mockAuthorizationComponent = {
			hasRoleForSubject: vi.fn().mockResolvedValue(true)
		} as unknown as IAuthorizationComponent;

		vi.spyOn(ComponentFactory, "get").mockImplementation(type => {
			if (type === "tenant-admin") {
				return mockTenantAdminComponent as never;
			}
			return mockAuthorizationComponent as never;
		});

		processor = new TenantOverrideProcessor();
	});

	it("should return the class name", () => {
		expect(processor.className()).toBe(TenantOverrideProcessor.CLASS_NAME);
	});

	it("should skip processing when route is undefined", async () => {
		const contextIds: IContextIds = { [ContextIdKeys.Tenant]: CALLER_TENANT };
		const response: IHttpResponse = {};
		await processor.pre(
			{ query: { "override-tenant": OVERRIDE_TENANT } } as unknown as IHttpServerRequest,
			response,
			undefined,
			contextIds,
			{}
		);

		expect(response.statusCode).toBeUndefined();
		expect(contextIds[ContextIdKeys.Tenant]).toBe(CALLER_TENANT);
	});

	it("should skip processing when route explicitly disables tenant override", async () => {
		const contextIds: IContextIds = { [ContextIdKeys.Tenant]: CALLER_TENANT };
		const response: IHttpResponse = {};
		await processor.pre(
			{ query: { "override-tenant": OVERRIDE_TENANT } } as unknown as IHttpServerRequest,
			response,
			{ operationId: "someRoute", path: "/", disableTenantOverride: true },
			contextIds,
			{}
		);

		expect(response.statusCode).toBeUndefined();
		expect(contextIds[ContextIdKeys.Tenant]).toBe(CALLER_TENANT);
	});

	it("should skip processing when override-tenant query param is absent", async () => {
		const contextIds: IContextIds = {
			[ContextIdKeys.Tenant]: CALLER_TENANT,
			[ContextIdKeys.User]: CALLER_USER
		};
		const response: IHttpResponse = {};
		await processor.pre(
			{ query: {} } as unknown as IHttpServerRequest,
			response,
			{ operationId: "tenantGetById", path: "/" },
			contextIds,
			{}
		);

		expect(response.statusCode).toBeUndefined();
		expect(contextIds[ContextIdKeys.Tenant]).toBe(CALLER_TENANT);
	});

	it("should skip processing when response already has a status code set", async () => {
		const contextIds: IContextIds = {
			[ContextIdKeys.Tenant]: CALLER_TENANT,
			[ContextIdKeys.User]: CALLER_USER
		};
		const response: IHttpResponse = { statusCode: HttpStatusCode.unauthorized };
		await processor.pre(
			{ query: { "override-tenant": OVERRIDE_TENANT } } as unknown as IHttpServerRequest,
			response,
			{ operationId: "tenantGetById", path: "/" },
			contextIds,
			{}
		);

		expect(response.statusCode).toBe(HttpStatusCode.unauthorized);
		expect(contextIds[ContextIdKeys.Tenant]).toBe(CALLER_TENANT);
		expect(mockTenantAdminComponent.get).not.toHaveBeenCalled();
	});

	it("should return 403 when caller user ID is not set in context", async () => {
		const contextIds: IContextIds = { [ContextIdKeys.Tenant]: CALLER_TENANT };
		const response: IHttpResponse = {};
		await processor.pre(
			{ query: { "override-tenant": OVERRIDE_TENANT } } as unknown as IHttpServerRequest,
			response,
			{ operationId: "tenantGetById", path: "/" },
			contextIds,
			{}
		);

		expect(response.statusCode).toBe(HttpStatusCode.forbidden);
		expect(contextIds[ContextIdKeys.Tenant]).toBe(CALLER_TENANT);
		expect(mockAuthorizationComponent.hasRoleForSubject).not.toHaveBeenCalled();
	});

	it("should return 403 when override-tenant is supplied but caller lacks escalated privilege", async () => {
		vi.mocked(mockAuthorizationComponent.hasRoleForSubject).mockResolvedValue(false);

		const contextIds: IContextIds = {
			[ContextIdKeys.Tenant]: CALLER_TENANT,
			[ContextIdKeys.User]: CALLER_USER
		};
		const response: IHttpResponse = {};
		await processor.pre(
			{ query: { "override-tenant": OVERRIDE_TENANT } } as unknown as IHttpServerRequest,
			response,
			{ operationId: "tenantGetById", path: "/" },
			contextIds,
			{}
		);

		expect(response.statusCode).toBe(HttpStatusCode.forbidden);
		expect(contextIds[ContextIdKeys.Tenant]).toBe(CALLER_TENANT);
		expect(mockTenantAdminComponent.get).not.toHaveBeenCalled();
	});

	it("should return 404 when override-tenant does not match a known tenant", async () => {
		getTenantMock.mockResolvedValue(undefined);

		const contextIds: IContextIds = {
			[ContextIdKeys.Tenant]: CALLER_TENANT,
			[ContextIdKeys.User]: CALLER_USER
		};
		const response: IHttpResponse = {};
		await processor.pre(
			{ query: { "override-tenant": INVALID_TENANT } } as unknown as IHttpServerRequest,
			response,
			{ operationId: "tenantGetById", path: "/" },
			contextIds,
			{}
		);

		expect(response.statusCode).toBe(HttpStatusCode.notFound);
		expect(contextIds[ContextIdKeys.Tenant]).toBe(CALLER_TENANT);
	});

	it("should return 404 when override-tenant does not exist in the system", async () => {
		getTenantMock.mockResolvedValue(undefined);

		const contextIds: IContextIds = {
			[ContextIdKeys.Tenant]: CALLER_TENANT,
			[ContextIdKeys.User]: CALLER_USER
		};
		const response: IHttpResponse = {};
		await processor.pre(
			{ query: { "override-tenant": OVERRIDE_TENANT } } as unknown as IHttpServerRequest,
			response,
			{ operationId: "tenantGetById", path: "/" },
			contextIds,
			{}
		);

		expect(response.statusCode).toBe(HttpStatusCode.notFound);
		expect(contextIds[ContextIdKeys.Tenant]).toBe(CALLER_TENANT);
	});

	it("should substitute the tenant partition and store the original when override is valid", async () => {
		const contextIds: IContextIds = {
			[ContextIdKeys.Tenant]: CALLER_TENANT,
			[ContextIdKeys.User]: CALLER_USER
		};
		const response: IHttpResponse = {};
		await processor.pre(
			{ query: { "override-tenant": OVERRIDE_TENANT } } as unknown as IHttpServerRequest,
			response,
			{ operationId: "tenantGetById", path: "/" },
			contextIds,
			{}
		);

		expect(response.statusCode).toBeUndefined();
		expect(contextIds[ContextIdKeys.Tenant]).toBe(OVERRIDE_TENANT);
		expect(contextIds[HttpContextIdKeys.OriginalTenant]).toBe(CALLER_TENANT);
		expect(mockTenantAdminComponent.get).toHaveBeenCalledWith(OVERRIDE_TENANT);
		expect(mockAuthorizationComponent.hasRoleForSubject).toHaveBeenCalledWith(
			"rest",
			CALLER_USER,
			TenantOverrideProcessor.DEFAULT_ESCALATED_PRIVILEGE_ROLE
		);
	});

	it("should respond with 403 body containing the error name", async () => {
		vi.mocked(mockAuthorizationComponent.hasRoleForSubject).mockResolvedValue(false);

		const contextIds: IContextIds = {
			[ContextIdKeys.Tenant]: CALLER_TENANT,
			[ContextIdKeys.User]: CALLER_USER
		};
		const response: IHttpResponse = {};
		await processor.pre(
			{ query: { "override-tenant": OVERRIDE_TENANT } } as unknown as IHttpServerRequest,
			response,
			{ operationId: "tenantGetById", path: "/" },
			contextIds,
			{}
		);

		expect(response.statusCode).toBe(HttpStatusCode.forbidden);
		const body = response.body as { name: string };
		expect(body.name).toBe(ForbiddenError.CLASS_NAME);
	});

	it("should accept a custom escalated privilege role when configured", async () => {
		vi.mocked(mockAuthorizationComponent.hasRoleForSubject).mockResolvedValue(true);

		const customProcessor = new TenantOverrideProcessor({
			config: { escalatedPrivilegeRole: "super-admin" }
		});
		const contextIds: IContextIds = {
			[ContextIdKeys.Tenant]: CALLER_TENANT,
			[ContextIdKeys.User]: CALLER_USER
		};
		const response: IHttpResponse = {};
		await customProcessor.pre(
			{ query: { "override-tenant": OVERRIDE_TENANT } } as unknown as IHttpServerRequest,
			response,
			{ operationId: "tenantGetById", path: "/" },
			contextIds,
			{}
		);

		expect(response.statusCode).toBeUndefined();
		expect(contextIds[ContextIdKeys.Tenant]).toBe(OVERRIDE_TENANT);
		expect(mockAuthorizationComponent.hasRoleForSubject).toHaveBeenCalledWith(
			"rest",
			CALLER_USER,
			"super-admin"
		);
	});

	it("should use a custom authorizationModelId when configured", async () => {
		const customProcessor = new TenantOverrideProcessor({
			config: { authorizationModelId: "custom-model" }
		});
		const contextIds: IContextIds = {
			[ContextIdKeys.Tenant]: CALLER_TENANT,
			[ContextIdKeys.User]: CALLER_USER
		};
		const response: IHttpResponse = {};
		await customProcessor.pre(
			{ query: { "override-tenant": OVERRIDE_TENANT } } as unknown as IHttpServerRequest,
			response,
			{ operationId: "tenantGetById", path: "/" },
			contextIds,
			{}
		);

		expect(response.statusCode).toBeUndefined();
		expect(mockAuthorizationComponent.hasRoleForSubject).toHaveBeenCalledWith(
			"custom-model",
			CALLER_USER,
			TenantOverrideProcessor.DEFAULT_ESCALATED_PRIVILEGE_ROLE
		);
	});
});
