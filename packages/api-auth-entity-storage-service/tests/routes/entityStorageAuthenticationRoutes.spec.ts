// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IHttpRequestContext, IHttpResponse } from "@3sixty/api-models";
import { ComponentFactory } from "@3sixty/core";
import { EntityStorageConnectorFactory } from "@3sixty/entity-storage-models";
import { VaultConnectorFactory } from "@3sixty/vault-models";
import { HeaderTypes } from "@3sixty/web";
import { AuthHeaderProcessor } from "../../src/processors/authHeaderProcessor.js";
import { authenticationAdoptIdentity } from "../../src/routes/entityStorageAuthenticationRoutes.js";

describe("authenticationAdoptIdentity", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		vi.spyOn(EntityStorageConnectorFactory, "get").mockReturnValue({} as never);
		vi.spyOn(VaultConnectorFactory, "get").mockReturnValue({} as never);
		vi.spyOn(ComponentFactory, "getIfExists").mockReturnValue(undefined);
	});

	it("should set the new token as a cookie and leave it out of the body", async () => {
		vi.spyOn(ComponentFactory, "get").mockReturnValue({
			adoptIdentity: vi.fn().mockResolvedValue({
				token: "new-jwt-token",
				expiry: 1722514341067
			})
		});
		const httpRequestContext = {
			processorState: {
				authTokenLocation: "authorization"
			}
		} as IHttpRequestContext;

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
		expect(httpRequestContext.processorState.authTokenLocation).not.toBe("authorization");
		expect(response.headers?.[HeaderTypes.SetCookie]).toContain("new-jwt-token");
	});
});
