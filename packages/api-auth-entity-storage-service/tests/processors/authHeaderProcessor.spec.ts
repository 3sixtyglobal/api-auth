// Copyright 2026 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { HttpErrorHelper, type IHttpResponse } from "@3sixty/api-models";
import { ContextIdKeys, ContextIdStore, type IContextIds } from "@3sixty/context";
import {
	ComponentFactory,
	Converter,
	type IError,
	LfuCache,
	UnauthorizedError
} from "@3sixty/core";
import { Blake2b } from "@3sixty/crypto";
import {
	EntityStorageConnectorFactory,
	type IEntityStorageConnector
} from "@3sixty/entity-storage-models";
import type { IVaultConnector } from "@3sixty/vault-models";
import { VaultConnectorFactory } from "@3sixty/vault-models";
import { HeaderTypes, HttpStatusCode } from "@3sixty/web";
import type { AuthenticationUser } from "../../src/entities/authenticationUser.js";
import { AuthHeaderProcessor } from "../../src/processors/authHeaderProcessor.js";
import { AuthTokenCache } from "../../src/utils/authTokenCache.js";
import { TokenHelper } from "../../src/utils/tokenHelper.js";

describe("AuthHeaderProcessor", () => {
	let mockUserEntityStorage: IEntityStorageConnector<AuthenticationUser>;
	let mockVaultConnector: IVaultConnector;
	let processor: AuthHeaderProcessor;

	beforeEach(() => {
		vi.restoreAllMocks();

		mockUserEntityStorage = {
			getSchema: vi.fn(),
			set: vi.fn(),
			get: vi.fn(),
			remove: vi.fn(),
			query: vi.fn()
		} as unknown as IEntityStorageConnector<AuthenticationUser>;

		mockVaultConnector = {
			get: vi.fn(),
			set: vi.fn(),
			remove: vi.fn()
		} as unknown as IVaultConnector;

		vi.spyOn(EntityStorageConnectorFactory, "get").mockReturnValue(mockUserEntityStorage);
		vi.spyOn(VaultConnectorFactory, "get").mockReturnValue(mockVaultConnector);
		vi.spyOn(ComponentFactory, "get").mockImplementation(componentName => {
			throw new Error(`Unexpected component ${componentName}`);
		});
		vi.spyOn(ComponentFactory, "getIfExists").mockReturnValue(undefined);

		processor = new AuthHeaderProcessor();
	});

	it("should populate context ids on successful verify", async () => {
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.Node]: "node-1",
			[ContextIdKeys.Organization]: "did:org:456"
		});
		vi.mocked(mockUserEntityStorage.get).mockResolvedValue({
			email: "user@example.com",
			accountId: "user-1",
			password: "hashed",
			salt: "salt",
			authProviderId: "entity-storage",
			dateCreated: "2026-01-01T00:00:00.000Z",
			dateModified: "2026-01-01T00:00:00.000Z",
			passwordVersion: 0
		});
		vi.spyOn(TokenHelper, "extractTokenFromHeaders").mockReturnValue({
			token: "jwt",
			location: "authorization"
		});
		vi.spyOn(TokenHelper, "verify").mockImplementation(
			async (vault, nodeId, key, token, verifyUser) => {
				// No tid - single-tenant or tenant-free token; only user+org verified.
				const verified = await verifyUser?.("user-1", undefined, 0);
				expect(verified).toEqual(["user"]);
				return {
					header: { alg: "EdDSA" },
					payload: { sub: "user-1" }
				};
			}
		);

		await processor.start();

		const contextIds: IContextIds = {};
		const response: IHttpResponse = {};
		await processor.pre({ headers: {} } as never, response, {} as never, contextIds, {});

		expect(response.statusCode).toBeUndefined();
		expect(contextIds[ContextIdKeys.Account]).toBe("user-1");
		expect(contextIds[ContextIdKeys.Organization]).toBe("did:org:456");
		expect(mockUserEntityStorage.get).toHaveBeenCalledWith("user-1");
	});

	it("should set tenant context from token when tenantAdminComponent is configured", async () => {
		const mockTenantAdminComponent = {
			className: vi.fn(),
			get: vi.fn().mockResolvedValue({ id: "tenant-1", publicOrigin: "https://t1.example.com" })
		};
		vi.spyOn(ComponentFactory, "getIfExists").mockImplementation(componentName => {
			if (componentName === "tenant-admin") {
				return mockTenantAdminComponent;
			}
			return undefined;
		});
		processor = new AuthHeaderProcessor();

		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.Node]: "node-1"
		});
		vi.mocked(mockUserEntityStorage.get).mockResolvedValue({
			email: "user@example.com",
			accountId: "user-1",
			password: "hashed",
			salt: "salt",
			authProviderId: "entity-storage",
			dateCreated: "2026-01-01T00:00:00.000Z",
			dateModified: "2026-01-01T00:00:00.000Z",
			passwordVersion: 0
		});
		vi.spyOn(TokenHelper, "extractTokenFromHeaders").mockReturnValue({
			token: "jwt",
			location: "authorization"
		});
		const tenantId = "tenant-1";
		vi.spyOn(TokenHelper, "verify").mockImplementation(
			async (vault, nodeId, key, token, verifyUser) => {
				const verified = await verifyUser?.("user-1", tenantId, 0);
				expect(verified).toContain("tenant");
				return {
					header: { alg: "EdDSA" },
					payload: { sub: "user-1", tid: tenantId }
				};
			}
		);

		await processor.start();

		const contextIds: IContextIds = {};
		const response: IHttpResponse = {};
		await processor.pre({ headers: {} } as never, response, {} as never, contextIds, {});

		expect(response.statusCode).toBeUndefined();
		expect(contextIds[ContextIdKeys.Tenant]).toBe("tenant-1");
		expect(contextIds[ContextIdKeys.Account]).toBe("user-1");
	});

	it("should return unauthorized response when verifyUser cannot confirm user", async () => {
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.Node]: "node-1"
		});
		vi.mocked(mockUserEntityStorage.get).mockRejectedValue(new Error("user not found"));
		vi.spyOn(TokenHelper, "extractTokenFromHeaders").mockReturnValue({
			token: "jwt",
			location: "authorization"
		});
		vi.spyOn(TokenHelper, "verify").mockImplementation(
			async (vault, nodeId, key, token, verifyUser) => {
				await verifyUser?.("user-1", undefined, undefined);
				throw new UnauthorizedError(TokenHelper.CLASS_NAME, "userNotVerified");
			}
		);
		const buildResponseSpy = vi.spyOn(HttpErrorHelper, "buildResponse");

		await processor.start();

		const contextIds: IContextIds = {
			[ContextIdKeys.Tenant]: "tenant-1"
		};
		const response: IHttpResponse = {};
		await processor.pre({ headers: {} } as never, response, {} as never, contextIds, {});

		expect(buildResponseSpy).toHaveBeenCalled();
		expect(response.statusCode).toBe(HttpStatusCode.unauthorized);
		expect(contextIds[ContextIdKeys.Account]).toBeUndefined();
		expect(contextIds[ContextIdKeys.User]).toBeUndefined();
	});

	it("should include the error stack in the unauthorized response when includeErrorStack is enabled", async () => {
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.Node]: "node-1"
		});
		vi.spyOn(TokenHelper, "extractTokenFromHeaders").mockReturnValue({
			token: "jwt",
			location: "authorization"
		});
		vi.spyOn(TokenHelper, "verify").mockRejectedValue(
			new UnauthorizedError(TokenHelper.CLASS_NAME, "invalidToken")
		);
		const stackProcessor = new AuthHeaderProcessor({ config: { includeErrorStack: true } });

		await stackProcessor.start();

		const response: IHttpResponse = {};
		await stackProcessor.pre(
			{ headers: {} } as never,
			response,
			{} as never,
			{ [ContextIdKeys.Tenant]: "tenant-1" },
			{}
		);

		expect(response.statusCode).toBe(HttpStatusCode.unauthorized);
		expect((response.body as IError).stack).toBeDefined();
	});

	it("should return unauthorized when token passwordVersion is stale after a password change", async () => {
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.Node]: "node-1"
		});
		vi.mocked(mockUserEntityStorage.get).mockResolvedValue({
			email: "user@example.com",
			accountId: "user-1",
			password: "hashed",
			salt: "salt",
			authProviderId: "entity-storage",
			dateCreated: "2026-01-01T00:00:00.000Z",
			dateModified: "2026-01-01T00:00:00.000Z",
			passwordVersion: 1
		});
		vi.spyOn(TokenHelper, "extractTokenFromHeaders").mockReturnValue({
			token: "jwt",
			location: "authorization"
		});
		const encryptedTenantId = "encrypted:tenant-1";
		vi.spyOn(TokenHelper, "verify").mockImplementation(
			async (vault, nodeId, key, token, verifyUser) => {
				// pver=0 in token but user has passwordVersion=1 - simulate stale token
				const verified = await verifyUser?.("user-1", encryptedTenantId, 0);
				if (!verified?.includes("user")) {
					throw new UnauthorizedError(TokenHelper.CLASS_NAME, "userNotVerified");
				}
				return {
					header: { alg: "EdDSA" },
					payload: { sub: "user-1", tid: encryptedTenantId }
				};
			}
		);
		const buildResponseSpy = vi.spyOn(HttpErrorHelper, "buildResponse");

		await processor.start();

		const contextIds: IContextIds = {
			[ContextIdKeys.Tenant]: "tenant-1"
		};
		const response: IHttpResponse = {};
		await processor.pre({ headers: {} } as never, response, {} as never, contextIds, {});

		expect(buildResponseSpy).toHaveBeenCalled();
		expect(response.statusCode).toBe(HttpStatusCode.unauthorized);
		expect(contextIds[ContextIdKeys.Account]).toBeUndefined();
		expect(contextIds[ContextIdKeys.User]).toBeUndefined();
		expect(mockUserEntityStorage.get).toHaveBeenCalledWith("user-1");
	});

	it("should return unauthorized when the account is disabled or unverified", async () => {
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.Node]: "node-1"
		});
		vi.spyOn(TokenHelper, "extractTokenFromHeaders").mockReturnValue({
			token: "jwt",
			location: "authorization"
		});
		vi.spyOn(TokenHelper, "verify").mockImplementation(
			async (vault, nodeId, key, token, verifyUser) => {
				const verified = await verifyUser?.("user-1", undefined, undefined);
				if (!verified?.includes("user")) {
					throw new UnauthorizedError(TokenHelper.CLASS_NAME, "userNotVerified");
				}
				return {
					header: { alg: "EdDSA" },
					payload: { sub: "user-1" }
				};
			}
		);
		await processor.start();

		for (const status of [{ dateDisabled: "2026-01-02T00:00:00.000Z" }, { verified: false }]) {
			vi.mocked(mockUserEntityStorage.get).mockResolvedValue({
				email: "user@example.com",
				accountId: "user-1",
				authProviderId: "entity-storage",
				dateCreated: "2026-01-01T00:00:00.000Z",
				dateModified: "2026-01-01T00:00:00.000Z",
				...status
			});
			const contextIds: IContextIds = {};
			const response: IHttpResponse = {};
			await processor.pre(
				{ headers: { authorization: "dateDisabled" in status ? "Bearer a" : "Bearer b" } } as never,
				response,
				{} as never,
				contextIds,
				{}
			);

			expect(response.statusCode).toBe(HttpStatusCode.unauthorized);
			expect(contextIds[ContextIdKeys.Account]).toBeUndefined();
		}
	});

	it("should return unauthorized when the account has been disabled", async () => {
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.Node]: "node-1"
		});
		vi.mocked(mockUserEntityStorage.get).mockResolvedValue({
			email: "user@example.com",
			accountId: "user-1",
			authProviderId: "entity-storage",
			dateCreated: "2026-01-01T00:00:00.000Z",
			dateModified: "2026-01-01T00:00:00.000Z",
			dateDisabled: "2026-02-01T00:00:00.000Z"
		});
		vi.spyOn(TokenHelper, "extractTokenFromHeaders").mockReturnValue({
			token: "jwt",
			location: "authorization"
		});
		vi.spyOn(TokenHelper, "verify").mockImplementation(
			async (vault, nodeId, key, token, verifyUser) => {
				const verified = await verifyUser?.("user-1", undefined, undefined);
				if (!verified?.includes("user")) {
					throw new UnauthorizedError(TokenHelper.CLASS_NAME, "userNotVerified");
				}
				return {
					header: { alg: "EdDSA" },
					payload: { sub: "user-1" }
				};
			}
		);

		await processor.start();

		const contextIds: IContextIds = {};
		const response: IHttpResponse = {};
		await processor.pre({ headers: {} } as never, response, {} as never, contextIds, {});

		expect(response.statusCode).toBe(HttpStatusCode.unauthorized);
		expect(contextIds[ContextIdKeys.Account]).toBeUndefined();
	});

	it("should succeed when token has no pver and user has no passwordVersion stored", async () => {
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.Node]: "node-1",
			[ContextIdKeys.Organization]: "did:org:456"
		});
		vi.mocked(mockUserEntityStorage.get).mockResolvedValue({
			email: "user@example.com",
			accountId: "user-1",
			password: "hashed",
			salt: "salt",
			authProviderId: "entity-storage",
			dateCreated: "2026-01-01T00:00:00.000Z",
			dateModified: "2026-01-01T00:00:00.000Z"
		});
		vi.spyOn(TokenHelper, "extractTokenFromHeaders").mockReturnValue({
			token: "jwt",
			location: "authorization"
		});
		vi.spyOn(TokenHelper, "verify").mockImplementation(
			async (vault, nodeId, key, token, verifyUser) => {
				// No tid - pver behaviour is the focus here.
				const verified = await verifyUser?.("user-1", undefined, undefined);
				expect(verified).toEqual(["user"]);
				return {
					header: { alg: "EdDSA" },
					payload: { sub: "user-1" }
				};
			}
		);

		await processor.start();

		const contextIds: IContextIds = {};
		const response: IHttpResponse = {};
		await processor.pre({ headers: {} } as never, response, {} as never, contextIds, {});

		expect(response.statusCode).toBeUndefined();
		expect(contextIds[ContextIdKeys.Account]).toBe("user-1");
		expect(contextIds[ContextIdKeys.Organization]).toBe("did:org:456");
		expect(mockUserEntityStorage.get).toHaveBeenCalledWith("user-1");
	});

	it("should return unauthorized when token has an encrypted tenant but tenantAdminComponent is not configured", async () => {
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.Node]: "node-1"
		});
		vi.mocked(mockUserEntityStorage.get).mockResolvedValue({
			email: "user@example.com",
			accountId: "user-1",
			password: "hashed",
			salt: "salt",
			authProviderId: "entity-storage",
			dateCreated: "2026-01-01T00:00:00.000Z",
			dateModified: "2026-01-01T00:00:00.000Z",
			passwordVersion: 0
		});
		vi.spyOn(TokenHelper, "extractTokenFromHeaders").mockReturnValue({
			token: "jwt",
			location: "authorization"
		});
		const encryptedTenantId = "encrypted:tenant-1";
		vi.spyOn(TokenHelper, "verify").mockImplementation(
			async (vault, nodeId, key, token, verifyUser) => {
				const verified = await verifyUser?.("user-1", encryptedTenantId, 0);
				if (!verified?.includes("tenant")) {
					throw new UnauthorizedError(TokenHelper.CLASS_NAME, "tenantNotVerified");
				}
				return {
					header: { alg: "EdDSA" },
					payload: { sub: "user-1", tid: encryptedTenantId }
				};
			}
		);
		const buildResponseSpy = vi.spyOn(HttpErrorHelper, "buildResponse");

		await processor.start();

		const contextIds: IContextIds = {};
		const response: IHttpResponse = {};
		await processor.pre({ headers: {} } as never, response, {} as never, contextIds, {});

		expect(buildResponseSpy).toHaveBeenCalled();
		expect(response.statusCode).toBe(HttpStatusCode.unauthorized);
		expect(contextIds[ContextIdKeys.Account]).toBeUndefined();
		expect(contextIds[ContextIdKeys.User]).toBeUndefined();
	});

	it("should overwrite existing context tenant with the one from the token", async () => {
		const mockTenantAdminComponent = {
			className: vi.fn(),
			get: vi.fn().mockResolvedValue({ id: "tenant-a", publicOrigin: "https://ta.example.com" })
		};
		vi.spyOn(ComponentFactory, "getIfExists").mockImplementation(componentName => {
			if (componentName === "tenant-admin") {
				return mockTenantAdminComponent;
			}
			return undefined;
		});
		processor = new AuthHeaderProcessor();

		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.Node]: "node-1"
		});
		vi.mocked(mockUserEntityStorage.get).mockResolvedValue({
			email: "user@example.com",
			accountId: "user-1",
			password: "hashed",
			salt: "salt",
			authProviderId: "entity-storage",
			dateCreated: "2026-01-01T00:00:00.000Z",
			dateModified: "2026-01-01T00:00:00.000Z",
			passwordVersion: 0
		});
		vi.spyOn(TokenHelper, "extractTokenFromHeaders").mockReturnValue({
			token: "jwt",
			location: "authorization"
		});
		const tenantA = "tenant-a";
		vi.spyOn(TokenHelper, "verify").mockImplementation(
			async (vault, nodeId, key, token, verifyUser) => {
				const verified = await verifyUser?.("user-1", tenantA, 0);
				expect(verified).toContain("tenant");
				return {
					header: { alg: "EdDSA" },
					payload: { sub: "user-1", tid: tenantA }
				};
			}
		);

		await processor.start();

		// Context had a different tenant - the token is the authoritative source.
		const contextIds: IContextIds = {
			[ContextIdKeys.Tenant]: "tenant-b"
		};
		const response: IHttpResponse = {};
		await processor.pre({ headers: {} } as never, response, {} as never, contextIds, {});

		expect(response.statusCode).toBeUndefined();
		expect(contextIds[ContextIdKeys.Tenant]).toBe("tenant-a");
		expect(contextIds[ContextIdKeys.Account]).toBe("user-1");
	});

	it("should succeed in single-tenant setup when neither context nor token has a tenant", async () => {
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.Node]: "node-1",
			[ContextIdKeys.Organization]: "did:org:456"
		});
		vi.mocked(mockUserEntityStorage.get).mockResolvedValue({
			email: "user@example.com",
			accountId: "user-1",
			password: "hashed",
			salt: "salt",
			authProviderId: "entity-storage",
			dateCreated: "2026-01-01T00:00:00.000Z",
			dateModified: "2026-01-01T00:00:00.000Z",
			passwordVersion: 0
		});
		vi.spyOn(TokenHelper, "extractTokenFromHeaders").mockReturnValue({
			token: "jwt",
			location: "authorization"
		});
		vi.spyOn(TokenHelper, "verify").mockImplementation(
			async (vault, nodeId, key, token, verifyUser) => {
				// No tid in token - single-tenant system, no tenant verification required.
				const verified = await verifyUser?.("user-1", undefined, 0);
				expect(verified).toEqual(["user"]);
				return {
					header: { alg: "EdDSA" },
					payload: { sub: "user-1" }
				};
			}
		);

		await processor.start();

		// No tenant in context - single-tenant system.
		const contextIds: IContextIds = {};
		const response: IHttpResponse = {};
		await processor.pre({ headers: {} } as never, response, {} as never, contextIds, {});

		expect(response.statusCode).toBeUndefined();
		expect(contextIds[ContextIdKeys.Account]).toBe("user-1");
		expect(contextIds[ContextIdKeys.Organization]).toBe("did:org:456");
		expect(contextIds[ContextIdKeys.Tenant]).toBeUndefined();
	});

	it("should return the class name", () => {
		expect(processor.className()).toBe(AuthHeaderProcessor.CLASS_NAME);
	});

	describe("_nodeOrganizationId", () => {
		const NODE_ORG = "did:node-org:111";

		beforeEach(() => {
			vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
				[ContextIdKeys.Node]: "node-1",
				[ContextIdKeys.Organization]: NODE_ORG
			});
			vi.mocked(mockUserEntityStorage.get).mockResolvedValue({
				email: "user@example.com",
				accountId: "user-1",
				password: "hashed",
				salt: "salt",
				authProviderId: "entity-storage",
				dateCreated: "2026-01-01T00:00:00.000Z",
				dateModified: "2026-01-01T00:00:00.000Z",
				passwordVersion: 0
			});
			vi.spyOn(TokenHelper, "extractTokenFromHeaders").mockReturnValue({
				token: "jwt",
				location: "authorization"
			});
		});

		it("sets Organization context to _nodeOrganizationId when no tenant ID is in the token", async () => {
			vi.spyOn(TokenHelper, "verify").mockImplementation(
				async (vault, nodeId, key, token, verifyUser) => {
					await verifyUser?.("user-1", undefined, 0);
					return { header: { alg: "EdDSA" }, payload: {} };
				}
			);

			await processor.start();

			const contextIds: IContextIds = {};
			const response: IHttpResponse = {};
			await processor.pre({ headers: {} } as never, response, {} as never, contextIds, {});

			expect(response.statusCode).toBeUndefined();
			expect(contextIds[ContextIdKeys.Organization]).toBe(NODE_ORG);
		});

		it("leaves the user and user organisation to the profile processor", async () => {
			vi.spyOn(TokenHelper, "verify").mockImplementation(
				async (vault, nodeId, key, token, verifyUser) => {
					await verifyUser?.("user-1", undefined, 0);
					return { header: { alg: "EdDSA" }, payload: {} };
				}
			);

			await processor.start();

			const contextIds: IContextIds = {};
			const response: IHttpResponse = {};
			await processor.pre({ headers: {} } as never, response, {} as never, contextIds, {});

			expect(response.statusCode).toBeUndefined();
			expect(contextIds[ContextIdKeys.Account]).toBe("user-1");
			expect(contextIds[ContextIdKeys.User]).toBeUndefined();
			expect(contextIds[ContextIdKeys.UserOrganization]).toBeUndefined();
		});

		it("tenant organizationId takes precedence over _nodeOrganizationId for Organization context", async () => {
			const TENANT_ORG = "did:tenant-org:999";
			const mockTenantAdminComponent = {
				className: vi.fn(),
				get: vi.fn().mockResolvedValue({ id: "tenant-1", organizationId: TENANT_ORG })
			};
			vi.spyOn(ComponentFactory, "getIfExists").mockImplementation(componentName => {
				if (componentName === "tenant-admin") {
					return mockTenantAdminComponent;
				}
				return undefined;
			});
			const multiTenantProcessor = new AuthHeaderProcessor();

			vi.spyOn(TokenHelper, "verify").mockImplementation(
				async (vault, nodeId, key, token, verifyUser) => {
					await verifyUser?.("user-1", "tenant-1", 0);
					return { header: { alg: "EdDSA" }, payload: {} };
				}
			);

			await multiTenantProcessor.start();

			const contextIds: IContextIds = {};
			const response: IHttpResponse = {};
			await multiTenantProcessor.pre(
				{ headers: {} } as never,
				response,
				{} as never,
				contextIds,
				{}
			);

			expect(response.statusCode).toBeUndefined();
			expect(contextIds[ContextIdKeys.Organization]).toBe(TENANT_ORG);
		});

		it("leaves the account unset when token verification fails", async () => {
			vi.spyOn(TokenHelper, "verify").mockRejectedValue(new Error("token invalid"));

			await processor.start();

			const contextIds: IContextIds = {};
			const response: IHttpResponse = {};
			await processor.pre({ headers: {} } as never, response, {} as never, contextIds, {});

			expect(response.statusCode).toBe(HttpStatusCode.unauthorized);
			expect(contextIds[ContextIdKeys.Account]).toBeUndefined();
		});
	});

	describe("post", () => {
		it("should set a cookie on login when token arrived via cookie", async () => {
			const response: IHttpResponse = {};
			await processor.post(
				{ headers: {} } as never,
				response,
				{} as never,
				{},
				{ authOperation: "login", authToken: "new-jwt-token", authTokenLocation: "cookie" }
			);

			expect(response.headers?.[HeaderTypes.SetCookie]).toContain("new-jwt-token");
		});

		it("should set a cookie on refresh when token arrived via cookie", async () => {
			const response: IHttpResponse = {};
			await processor.post(
				{ headers: {} } as never,
				response,
				{} as never,
				{},
				{ authOperation: "refresh", authToken: "refreshed-jwt", authTokenLocation: "cookie" }
			);

			expect(response.headers?.[HeaderTypes.SetCookie]).toContain("refreshed-jwt");
		});

		it("should delete the cookie on logout when token arrived via cookie", async () => {
			const response: IHttpResponse = {};
			await processor.post(
				{ headers: {} } as never,
				response,
				{} as never,
				{},
				{ authOperation: "logout", authToken: "old-jwt", authTokenLocation: "cookie" }
			);

			const cookies = response.headers?.[HeaderTypes.SetCookie] as string[];
			expect(cookies).toHaveLength(2);
			expect(cookies[0]).toMatch(/^access_token=;.*Max-Age=0/);
			expect(cookies[1]).toMatch(/^oauth_transaction=;.*Max-Age=0/);
		});

		it("should keep the cookies a route has set when setting the session cookie", async () => {
			const response: IHttpResponse = {
				headers: { [HeaderTypes.SetCookie]: "oauth_transaction=; Max-Age=0" }
			};
			await processor.post(
				{ headers: {} } as never,
				response,
				{} as never,
				{},
				{ authOperation: "login", authToken: "new-jwt-token", authTokenLocation: "cookie" }
			);

			const cookies = response.headers?.[HeaderTypes.SetCookie] as string[];
			expect(cookies[0]).toBe("oauth_transaction=; Max-Age=0");
			expect(cookies[1]).toMatch(/^access_token=new-jwt-token/);
		});

		it("should remove the configured cookies on logout", async () => {
			const configured = new AuthHeaderProcessor({ config: { logoutCookieNames: [] } });
			const response: IHttpResponse = {};
			await configured.post(
				{ headers: {} } as never,
				response,
				{} as never,
				{},
				{ authOperation: "logout", authTokenLocation: "cookie" }
			);

			expect(response.headers?.[HeaderTypes.SetCookie]).toMatch(/^access_token=;/);
			await configured.stop();
		});

		it("should set and delete the session cookie with SameSite None by default", async () => {
			for (const authOperation of ["login", "logout"]) {
				const response: IHttpResponse = {};
				await processor.post(
					{ headers: {} } as never,
					response,
					{} as never,
					{},
					{ authOperation, authToken: "new-jwt-token", authTokenLocation: "cookie" }
				);

				const cookies = response.headers?.[HeaderTypes.SetCookie];
				const sessionCookie = (Array.isArray(cookies) ? cookies[0] : cookies) ?? "";
				expect(sessionCookie).toMatch(/SameSite=None/);
				expect(sessionCookie).toMatch(/Secure/);
			}
		});

		it("should use the configured SameSite on the session cookie", async () => {
			const configured = new AuthHeaderProcessor({ config: { cookieSameSite: "Lax" } });
			for (const authOperation of ["refresh", "logout"]) {
				const response: IHttpResponse = {};
				await configured.post(
					{ headers: {} } as never,
					response,
					{} as never,
					{},
					{ authOperation, authToken: "new-jwt-token", authTokenLocation: "cookie" }
				);

				const cookies = response.headers?.[HeaderTypes.SetCookie];
				const sessionCookie = (Array.isArray(cookies) ? cookies[0] : cookies) ?? "";
				expect(sessionCookie).toMatch(/SameSite=Lax/);
				expect(sessionCookie).toMatch(/Secure/);
			}
			await configured.stop();
		});

		it("should refuse an unknown SameSite value", () => {
			expect(
				() =>
					new AuthHeaderProcessor({
						config: { cookieSameSite: "Loose" as unknown as "Lax" }
					})
			).toThrow();
		});

		it("should not set a cookie when the request came from an Authorization header", async () => {
			const response: IHttpResponse = {};
			await processor.post(
				{ headers: {} } as never,
				response,
				{} as never,
				{},
				{ authOperation: "login", authToken: "new-jwt-token", authTokenLocation: "authorization" }
			);

			expect(response.headers).toBeUndefined();
		});

		it("should not set a cookie when route is absent", async () => {
			const response: IHttpResponse = {};
			await processor.post(
				{ headers: {} } as never,
				response,
				undefined,
				{},
				{ authOperation: "login", authToken: "new-jwt-token", authTokenLocation: "cookie" }
			);

			expect(response.headers).toBeUndefined();
		});
	});

	describe("token cache", () => {
		const USER: AuthenticationUser = {
			email: "user@example.com",
			accountId: "user-1",
			password: "hashed",
			salt: "salt",
			authProviderId: "entity-storage",
			dateCreated: "2026-01-01T00:00:00.000Z",
			dateModified: "2026-01-01T00:00:00.000Z",
			passwordVersion: 0
		};

		/**
		 * Stand in for a real verification, resolving the token through the supplied verifyUser
		 * callback so the tenant and user lookups behind it actually run.
		 * @param expSeconds The expiry claim to report for the token, if any.
		 */
		function mockVerify(expSeconds?: number): void {
			vi.spyOn(TokenHelper, "verify").mockImplementation(
				async (vault, nodeId, key, token, verifyUser) => {
					await verifyUser?.("user-1", undefined, 0);
					return {
						header: { alg: "EdDSA" },
						payload: { sub: "user-1", exp: expSeconds }
					};
				}
			);
		}

		/**
		 * Drive one request through the processor.
		 * @param authProcessor The processor under test.
		 * @returns The response and the context ids the processor populated.
		 */
		async function runRequest(
			authProcessor: AuthHeaderProcessor
		): Promise<{ response: IHttpResponse; contextIds: IContextIds }> {
			const response: IHttpResponse = {};
			const contextIds: IContextIds = {};
			await authProcessor.pre({ headers: {} } as never, response, {} as never, contextIds, {});
			return { response, contextIds };
		}

		afterEach(() => {
			vi.useRealTimers();
		});

		beforeEach(() => {
			vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
				[ContextIdKeys.Node]: "node-1",
				[ContextIdKeys.Organization]: "did:org:456"
			});
			vi.mocked(mockUserEntityStorage.get).mockResolvedValue(USER);
			vi.spyOn(TokenHelper, "extractTokenFromHeaders").mockReturnValue({
				token: "jwt",
				location: "authorization"
			});
		});

		it("verifies and looks the user up only once for a repeated token", async () => {
			mockVerify();
			const authProcessor = new AuthHeaderProcessor();
			await authProcessor.start();

			for (let i = 0; i < 3; i++) {
				const { response, contextIds } = await runRequest(authProcessor);
				expect(response.statusCode).toBeUndefined();
				expect(contextIds[ContextIdKeys.Account]).toBe("user-1");
			}

			expect(TokenHelper.verify).toHaveBeenCalledTimes(1);
			expect(mockUserEntityStorage.get).toHaveBeenCalledTimes(1);

			await authProcessor.stop();
		});

		it("collapses concurrent requests with the same token into one verification", async () => {
			let inFlight = 0;
			let maxInFlight = 0;
			vi.spyOn(TokenHelper, "verify").mockImplementation(
				async (vault, nodeId, key, token, verifyUser) => {
					inFlight++;
					maxInFlight = Math.max(maxInFlight, inFlight);
					await new Promise(resolve => setTimeout(resolve, 20));
					await verifyUser?.("user-1", undefined, 0);
					inFlight--;
					return {
						header: { alg: "EdDSA" },
						payload: { sub: "user-1" }
					};
				}
			);

			const authProcessor = new AuthHeaderProcessor();
			await authProcessor.start();

			const responses = await Promise.all([0, 1, 2, 3].map(async () => runRequest(authProcessor)));

			for (const { response } of responses) {
				expect(response.statusCode).toBeUndefined();
			}
			expect(maxInFlight).toBe(1);
			expect(TokenHelper.verify).toHaveBeenCalledTimes(1);
			expect(mockUserEntityStorage.get).toHaveBeenCalledTimes(1);

			await authProcessor.stop();
		});

		it("keys the cache by a hash of the token, never the token itself", async () => {
			mockVerify();
			const getOrSet = vi.spyOn(LfuCache.prototype, "getOrSet");

			const authProcessor = new AuthHeaderProcessor();
			await authProcessor.start();

			const { response } = await runRequest(authProcessor);
			expect(response.statusCode).toBeUndefined();

			const cacheKey = getOrSet.mock.calls[0][0];
			expect(cacheKey).not.toBe("jwt");
			expect(cacheKey).toBe(Converter.bytesToHex(Blake2b.sum256(Converter.utf8ToBytes("jwt"))));

			await authProcessor.stop();
		});

		it("never holds a token beyond its own expiry", async () => {
			// Only the clock is faked; the cache and its mutex rely on real timers.
			vi.useFakeTimers({ toFake: ["Date"] });
			const start = Date.now();
			mockVerify(Math.trunc(start / 1000) + 60);

			// The cache lifetime is far longer than the token, so only the expiry claim can be
			// what ends the entry.
			const authProcessor = new AuthHeaderProcessor({ config: { tokenCacheTtlMs: 600000 } });
			await authProcessor.start();

			await runRequest(authProcessor);
			expect(TokenHelper.verify).toHaveBeenCalledTimes(1);

			// Past the expiry claim the entry is dropped, so the token is verified afresh and the
			// rejection comes from the normal verification path.
			vi.setSystemTime(start + 61000);

			await runRequest(authProcessor);
			expect(TokenHelper.verify).toHaveBeenCalledTimes(2);

			await authProcessor.stop();
		});

		it("expires a cached token a fixed time after it was verified, however busy the caller", async () => {
			// Only the clock is faked; the cache and its mutex rely on real timers.
			vi.useFakeTimers({ toFake: ["Date"] });
			const start = Date.now();
			mockVerify();
			const authProcessor = new AuthHeaderProcessor({ config: { tokenCacheTtlMs: 60000 } });
			await authProcessor.start();

			await runRequest(authProcessor);

			// Steady traffic inside the lifetime keeps hitting the same entry.
			vi.setSystemTime(start + 30000);
			await runRequest(authProcessor);
			expect(TokenHelper.verify).toHaveBeenCalledTimes(1);

			// Those hits must not extend it; once the lifetime is up the token is verified afresh.
			vi.setSystemTime(start + 70000);
			await runRequest(authProcessor);
			expect(TokenHelper.verify).toHaveBeenCalledTimes(2);

			await authProcessor.stop();
		});

		it("verifies every request when caching is disabled", async () => {
			mockVerify();
			const authProcessor = new AuthHeaderProcessor({ config: { tokenCacheTtlMs: 0 } });
			await authProcessor.start();

			for (let i = 0; i < 3; i++) {
				await runRequest(authProcessor);
			}

			expect(TokenHelper.verify).toHaveBeenCalledTimes(3);
			expect(mockUserEntityStorage.get).toHaveBeenCalledTimes(3);

			await authProcessor.stop();
		});

		it("keeps distinct tokens apart", async () => {
			mockVerify();
			const authProcessor = new AuthHeaderProcessor();
			await authProcessor.start();

			await runRequest(authProcessor);

			vi.spyOn(TokenHelper, "extractTokenFromHeaders").mockReturnValue({
				token: "other-jwt",
				location: "authorization"
			});
			await runRequest(authProcessor);

			expect(TokenHelper.verify).toHaveBeenCalledTimes(2);

			await authProcessor.stop();
		});

		it("does not cache a failed verification", async () => {
			vi.spyOn(TokenHelper, "verify").mockRejectedValue(
				new UnauthorizedError("tokenHelper", "invalidSignature")
			);
			const authProcessor = new AuthHeaderProcessor();
			await authProcessor.start();

			const first = await runRequest(authProcessor);
			const second = await runRequest(authProcessor);

			expect(first.response.statusCode).toBe(HttpStatusCode.unauthorized);
			expect(second.response.statusCode).toBe(HttpStatusCode.unauthorized);
			expect(TokenHelper.verify).toHaveBeenCalledTimes(2);

			await authProcessor.stop();
		});

		it("verifies the tokens of an account again once its sessions end", async () => {
			mockVerify();
			const authProcessor = new AuthHeaderProcessor();
			await authProcessor.start();

			await runRequest(authProcessor);
			AuthTokenCache.invalidate("other-account");
			await runRequest(authProcessor);
			expect(TokenHelper.verify).toHaveBeenCalledTimes(1);

			AuthTokenCache.invalidate("user-1");
			await runRequest(authProcessor);
			expect(TokenHelper.verify).toHaveBeenCalledTimes(2);

			await authProcessor.stop();
		});

		it("does not keep a token verified while the sessions of an account ended", async () => {
			vi.spyOn(TokenHelper, "verify").mockImplementation(
				async (vault, nodeId, key, token, verifyUser) => {
					await verifyUser?.("user-1", undefined, 0);
					// The account changes after it was read but before the result is cached.
					AuthTokenCache.invalidate("user-1");
					return { header: { alg: "EdDSA" }, payload: { sub: "user-1" } };
				}
			);
			const authProcessor = new AuthHeaderProcessor();
			await authProcessor.start();

			await runRequest(authProcessor);
			await runRequest(authProcessor);

			// Each request verifies again outside the cache, as the sessions ended meanwhile.
			expect(TokenHelper.verify).toHaveBeenCalledTimes(4);

			await authProcessor.stop();
		});

		it("does not use a token another request verified while the sessions of an account ended", async () => {
			let release: () => void = () => {};
			const blocked = new Promise<void>(resolve => {
				release = resolve;
			});
			let calls = 0;
			let invalidated = false;
			let callsAfterInvalidation = 0;
			vi.spyOn(TokenHelper, "verify").mockImplementation(
				async (vault, nodeId, key, token, verifyUser) => {
					calls++;
					if (invalidated) {
						callsAfterInvalidation++;
					}
					await verifyUser?.("user-1", undefined, 0);
					if (calls === 1) {
						await blocked;
					}
					return { header: { alg: "EdDSA" }, payload: { sub: "user-1" } };
				}
			);
			const authProcessor = new AuthHeaderProcessor();
			await authProcessor.start();

			const first = runRequest(authProcessor);
			const second = runRequest(authProcessor);
			await new Promise(resolve => setTimeout(resolve, 20));
			// The sessions end while the first request verifies and the second waits for it.
			AuthTokenCache.invalidate("user-1");
			invalidated = true;
			release();
			await Promise.all([first, second]);

			// Both requests use a verification started after the sessions ended, whether the second
			// was given the first result from the cache or verified itself.
			expect(callsAfterInvalidation).toBeGreaterThanOrEqual(2);

			await authProcessor.stop();
		});

		it("gives the session start of the token to the routes", async () => {
			vi.spyOn(TokenHelper, "verify").mockImplementation(
				async (vault, nodeId, key, token, verifyUser) => {
					await verifyUser?.("user-1", undefined, 0);
					return { header: { alg: "EdDSA" }, payload: { sub: "user-1", sst: 1700000000 } };
				}
			);
			const authProcessor = new AuthHeaderProcessor();
			await authProcessor.start();

			for (let i = 0; i < 2; i++) {
				const processorState: { [id: string]: unknown } = {};
				await authProcessor.pre({ headers: {} } as never, {}, {} as never, {}, processorState);
				expect(processorState.authSessionStart).toBe(1700000000);
			}
			expect(TokenHelper.verify).toHaveBeenCalledTimes(1);

			await authProcessor.stop();
		});

		it("releases the cache on stop", async () => {
			mockVerify();
			const authProcessor = new AuthHeaderProcessor();
			await authProcessor.start();
			await runRequest(authProcessor);

			await authProcessor.stop();

			// A destroyed cache holds nothing, so the next request verifies again.
			await runRequest(authProcessor);

			expect(TokenHelper.verify).toHaveBeenCalledTimes(2);
		});
	});
});
