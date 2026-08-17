// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type {
	IAuthenticationAuditComponent,
	IAuthenticationAuditEntry
} from "@twin.org/api-auth-models";
import { ComponentFactory } from "@twin.org/core";
import { HeaderTypes, HttpStatusCode } from "@twin.org/web";
import {
	authenticationAuditCreate,
	authenticationAuditGet,
	authenticationAuditQuery,
	authenticationAuditRemove,
	authenticationAuditUpdate,
	generateRestRoutesAuthenticationAudit,
	tagsAuthenticationAudit
} from "../../src/routes/entityStorageAuthenticationAuditRoutes.js";

describe("entityStorageAuthenticationAuditRoutes", () => {
	let mockAuditComponent: IAuthenticationAuditComponent;

	beforeEach(() => {
		vi.restoreAllMocks();

		mockAuditComponent = {
			className: vi.fn().mockReturnValue("AuthenticationAuditService"),
			create: vi.fn(),
			get: vi.fn(),
			update: vi.fn(),
			remove: vi.fn(),
			query: vi.fn()
		};

		vi.spyOn(ComponentFactory, "get").mockReturnValue(mockAuditComponent);
	});

	it("should create an audit entry and set the location header", async () => {
		vi.mocked(mockAuditComponent.create).mockResolvedValue("audit-id-1");

		const result = await authenticationAuditCreate(
			{} as never,
			"authentication-audit",
			{
				body: {
					actorId: "user@example.com",
					event: "login-success",
					data: {
						organizationIdentity: "did:example:org1"
					}
				}
			},
			"authentication/audit"
		);

		expect(mockAuditComponent.create).toHaveBeenCalledWith({
			actorId: "user@example.com",
			event: "login-success",
			data: {
				organizationIdentity: "did:example:org1"
			}
		});
		expect(result).toEqual({
			statusCode: HttpStatusCode.created,
			headers: {
				[HeaderTypes.Location]: "/authentication/audit/audit-id-1"
			}
		});
	});

	it("should get an audit entry by id", async () => {
		const entry: IAuthenticationAuditEntry = {
			id: "audit-id-1",
			event: "login-success",
			dateCreated: "2026-01-01T00:00:00.000Z",
			actorId: "user@example.com"
		};
		vi.mocked(mockAuditComponent.get).mockResolvedValue(entry);

		const result = await authenticationAuditGet({} as never, "authentication-audit", {
			pathParams: { id: "audit-id-1" }
		});

		expect(mockAuditComponent.get).toHaveBeenCalledWith("audit-id-1");
		expect(result).toEqual({ body: entry });
	});

	it("should update an audit entry and return no content", async () => {
		vi.mocked(mockAuditComponent.update).mockResolvedValue(undefined);

		const result = await authenticationAuditUpdate({} as never, "authentication-audit", {
			pathParams: { id: "audit-id-1" },
			body: { event: "login-failure" }
		});

		expect(mockAuditComponent.update).toHaveBeenCalledWith("audit-id-1", {
			event: "login-failure"
		});
		expect(result).toEqual({ statusCode: HttpStatusCode.noContent });
	});

	it("should remove an audit entry and return no content", async () => {
		vi.mocked(mockAuditComponent.remove).mockResolvedValue(undefined);

		const result = await authenticationAuditRemove({} as never, "authentication-audit", {
			pathParams: { id: "audit-id-1" }
		});

		expect(mockAuditComponent.remove).toHaveBeenCalledWith("audit-id-1");
		expect(result).toEqual({ statusCode: HttpStatusCode.noContent });
	});

	it("should query audit entries with coerced limit", async () => {
		const entries: IAuthenticationAuditEntry[] = [
			{
				id: "audit-id-1",
				event: "login-success",
				dateCreated: "2026-01-01T00:00:00.000Z",
				actorId: "user@example.com"
			}
		];
		vi.mocked(mockAuditComponent.query).mockResolvedValue({
			entries,
			cursor: "next-cursor"
		});

		const result = await authenticationAuditQuery({} as never, "authentication-audit", {
			query: {
				actorId: "user@example.com",
				event: "login-success",
				startDate: "2026-01-01T00:00:00.000Z",
				endDate: "2026-01-31T23:59:59.999Z",
				cursor: "start-cursor",
				limit: "50"
			}
		});

		expect(mockAuditComponent.query).toHaveBeenCalledWith(
			{
				actorId: "user@example.com",
				organizationId: undefined,
				tenantId: undefined,
				nodeId: undefined,
				event: "login-success",
				startDate: "2026-01-01T00:00:00.000Z",
				endDate: "2026-01-31T23:59:59.999Z"
			},
			"start-cursor",
			50
		);
		expect(result).toEqual({
			body: {
				entries,
				cursor: "next-cursor"
			}
		});
	});

	it("should generate routes with expected metadata", () => {
		const routes = generateRestRoutesAuthenticationAudit("authentication/audit", "auth-audit");

		expect(tagsAuthenticationAudit[0].name).toBe("Authentication Audit");
		expect(routes).toHaveLength(5);
		expect(routes[0].operationId).toBe("authenticationAuditCreate");
		expect(routes[1].operationId).toBe("authenticationAuditGet");
		expect(routes[2].operationId).toBe("authenticationAuditUpdate");
		expect(routes[3].operationId).toBe("authenticationAuditRemove");
		expect(routes[4].operationId).toBe("authenticationAuditQuery");
	});
});
