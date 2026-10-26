// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IHttpRequestContext, IHttpResponse } from "@3sixty/api-models";
import { ComponentFactory } from "@3sixty/core";
import {
	EntityStorageConnectorFactory,
	type IEntityStorageConnector
} from "@3sixty/entity-storage-models";
import { VaultConnectorFactory, type IVaultConnector } from "@3sixty/vault-models";
import { HeaderTypes } from "@3sixty/web";
import { AuthHeaderProcessor } from "../../src/processors/authHeaderProcessor.js";
import {
	authenticationAdoptIdentity,
	generateRestRoutesAuthentication
} from "../../src/routes/entityStorageAuthenticationRoutes.js";

describe("authenticationAdoptIdentity", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		const entityStorage = {} as unknown as IEntityStorageConnector;
		const vault = {} as unknown as IVaultConnector;
		vi.spyOn(EntityStorageConnectorFactory, "get").mockReturnValue(entityStorage);
		vi.spyOn(VaultConnectorFactory, "get").mockReturnValue(vault);
		vi.spyOn(ComponentFactory, "getIfExists").mockReturnValue(undefined);
	});

	it("should leave the session untouched for a bearer caller", async () => {
		const authentication = {
			className: () => "authentication",
			adoptIdentity: vi.fn().mockResolvedValue(undefined)
		};
		vi.spyOn(ComponentFactory, "get").mockReturnValue(authentication);
		const httpRequestContext = {
			serverRequest: { headers: {} },
			processorState: {
				authTokenLocation: "authorization"
			}
		} as unknown as IHttpRequestContext;

		const result = await authenticationAdoptIdentity(httpRequestContext, "authentication");
		const response: IHttpResponse = {};
		const processor = new AuthHeaderProcessor();
		await processor.post(
			{ headers: {} } as never,
			response,
			{} as never,
			{},
			httpRequestContext.processorState
		);

		expect(result.statusCode).toBe(204);
		expect(httpRequestContext.processorState.authOperation).toBeUndefined();
		expect(httpRequestContext.processorState.authToken).toBeUndefined();
		expect(response.headers?.[HeaderTypes.SetCookie]).toBeUndefined();
	});

	it("should leave the session cookie untouched when the caller did not use a bearer token", async () => {
		const authentication = {
			className: () => "authentication",
			adoptIdentity: vi.fn().mockResolvedValue(undefined)
		};
		vi.spyOn(ComponentFactory, "get").mockReturnValue(authentication);
		const httpRequestContext = {
			serverRequest: { headers: {} },
			processorState: {}
		} as unknown as IHttpRequestContext;

		const result = await authenticationAdoptIdentity(httpRequestContext, "authentication");
		const response: IHttpResponse = {};
		const processor = new AuthHeaderProcessor();
		await processor.post(
			{ headers: {} } as never,
			response,
			{} as never,
			{},
			httpRequestContext.processorState
		);

		expect(result.statusCode).toBe(204);
		expect(response.headers?.[HeaderTypes.SetCookie]).toBeUndefined();
	});
});

describe("authentication routes before a DID exists", () => {
	it("should stay authenticated without an authorization subject", () => {
		const routes = generateRestRoutesAuthentication("/authentication", "authentication");
		const updatePassword = routes.find(
			route => route.operationId === "authenticationUpdatePassword"
		);
		const adoptIdentity = routes.find(route => route.operationId === "authenticationAdoptIdentity");

		expect(updatePassword?.requiresAuthorization).toBe(false);
		expect(updatePassword?.skipAuth).toBeUndefined();
		expect(adoptIdentity?.requiresAuthorization).toBe(false);
		expect(adoptIdentity?.skipAuth).toBeUndefined();
	});
});
