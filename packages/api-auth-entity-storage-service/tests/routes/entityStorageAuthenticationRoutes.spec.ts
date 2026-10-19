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
import { authenticationAdoptIdentity } from "../../src/routes/entityStorageAuthenticationRoutes.js";

describe("authenticationAdoptIdentity", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		const entityStorage = {} as unknown as IEntityStorageConnector;
		const vault = {} as unknown as IVaultConnector;
		vi.spyOn(EntityStorageConnectorFactory, "get").mockReturnValue(entityStorage);
		vi.spyOn(VaultConnectorFactory, "get").mockReturnValue(vault);
		vi.spyOn(ComponentFactory, "getIfExists").mockReturnValue(undefined);
	});

	it("should leave the token out of the body and out of the cookie for a bearer caller", async () => {
		const authentication = {
			className: () => "authentication",
			adoptIdentity: vi.fn().mockResolvedValue({
				token: "new-jwt-token",
				expiry: 1722514341067
			})
		};
		vi.spyOn(ComponentFactory, "get").mockReturnValue(authentication);
		const httpRequestContext = {
			serverRequest: { headers: {} },
			processorState: {
				authTokenLocation: "authorization"
			}
		} as unknown as IHttpRequestContext;

		const result = await authenticationAdoptIdentity(httpRequestContext, "authentication");
		const response: IHttpResponse = {
			body: result.body
		};
		const processor = new AuthHeaderProcessor();
		await processor.post(
			{ headers: {} } as never,
			response,
			{} as never,
			{},
			httpRequestContext.processorState
		);

		expect(result.body).toEqual({ expiry: 1722514341067 });
		expect(result.body).not.toHaveProperty("token");
		expect(JSON.stringify(result.body)).not.toContain("new-jwt-token");
		expect(httpRequestContext.processorState.authOperation).toBe("login");
		expect(httpRequestContext.processorState.authToken).toBe("new-jwt-token");
		expect(httpRequestContext.processorState.authTokenLocation).toBe("authorization");
		expect(response.headers?.[HeaderTypes.SetCookie]).toBeUndefined();
	});

	it("should set the new token as a cookie when the caller did not use a bearer token", async () => {
		const authentication = {
			className: () => "authentication",
			adoptIdentity: vi.fn().mockResolvedValue({
				token: "new-jwt-token",
				expiry: 1722514341067
			})
		};
		vi.spyOn(ComponentFactory, "get").mockReturnValue(authentication);
		const httpRequestContext = {
			serverRequest: { headers: {} },
			processorState: {}
		} as unknown as IHttpRequestContext;

		const result = await authenticationAdoptIdentity(httpRequestContext, "authentication");
		const response: IHttpResponse = {
			body: result.body
		};
		const processor = new AuthHeaderProcessor();
		await processor.post(
			{ headers: {} } as never,
			response,
			{} as never,
			{},
			httpRequestContext.processorState
		);

		expect(response.headers?.[HeaderTypes.SetCookie]).toContain("new-jwt-token");
	});
});
