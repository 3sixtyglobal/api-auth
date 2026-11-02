// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { HttpContextIdKeys, type IHttpRequestContext } from "@3sixty/api-models";
import { ContextIdStore } from "@3sixty/context";
import { ComponentFactory, GeneralError } from "@3sixty/core";
import { HeaderTypes, HttpStatusCode } from "@3sixty/web";
import {
	OAUTH_TRANSACTION_COOKIE,
	generateRestRoutesOAuth,
	oauthCallback,
	oauthStart
} from "../../src/routes/oauthRoutes.js";

const CALLBACK_URL = "https://node.example.com/authentication/oauth/google/callback";

describe("oauthRoutes", () => {
	let beginSignIn: ReturnType<typeof vi.fn>;
	let completeSignIn: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.restoreAllMocks();
		beginSignIn = vi.fn().mockResolvedValue({
			location: "https://accounts.example.com/authorize",
			transaction: "transaction-1"
		});
		completeSignIn = vi.fn().mockResolvedValue({
			location: "https://app.example.com/",
			login: { token: "jwt-token", expiry: 123, profileReadOnly: true }
		});
		const component = { className: () => "oauth", beginSignIn, completeSignIn };
		vi.spyOn(ComponentFactory, "get").mockReturnValue(component);
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[HttpContextIdKeys.PublicOrigin]: "https://node.example.com"
		});
	});

	it("should generate public start and callback routes", () => {
		const routes = generateRestRoutesOAuth("authentication/oauth", "oauth");

		expect(routes.map(r => [r.method, r.path, r.skipAuth])).toEqual([
			["GET", "authentication/oauth/:authProviderId/start", true],
			["GET", "authentication/oauth/:authProviderId/callback", true]
		]);
	});

	it("should redirect to the provider and keep the transaction in a cookie", async () => {
		const httpRequestContext = {
			serverRequest: { headers: {} },
			processorState: {}
		} as unknown as IHttpRequestContext;

		const response = await oauthStart(
			httpRequestContext,
			"oauth",
			{ pathParams: { authProviderId: "google" } },
			"/authentication/oauth"
		);

		expect(beginSignIn).toHaveBeenCalledWith("google", CALLBACK_URL);
		expect(response.statusCode).toBe(HttpStatusCode.found);
		expect(response.headers[HeaderTypes.Location]).toBe("https://accounts.example.com/authorize");
		const cookie = response.headers[HeaderTypes.SetCookie] as string;
		expect(cookie).toContain(`${OAUTH_TRANSACTION_COOKIE}=transaction-1`);
		expect(cookie).toContain("HttpOnly");
		expect(cookie).toContain("SameSite=Lax");
	});

	it("should refuse to start without a public origin", async () => {
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({});

		await expect(
			oauthStart(
				{ serverRequest: { headers: {} }, processorState: {} } as unknown as IHttpRequestContext,
				"oauth",
				{ pathParams: { authProviderId: "google" } },
				"/authentication/oauth"
			)
		).rejects.toThrow(GeneralError);
	});

	it("should complete the sign in and hand the token to the auth processor", async () => {
		const httpRequestContext = {
			serverRequest: {
				headers: { [HeaderTypes.Cookie]: `${OAUTH_TRANSACTION_COOKIE}=transaction-1` }
			},
			processorState: {}
		} as unknown as IHttpRequestContext;

		const response = await oauthCallback(
			httpRequestContext,
			"oauth",
			{ pathParams: { authProviderId: "google" }, query: { code: "code-1", state: "state-1" } },
			"/authentication/oauth"
		);

		expect(completeSignIn).toHaveBeenCalledWith(
			"google",
			CALLBACK_URL,
			{ code: "code-1", state: "state-1" },
			"transaction-1"
		);
		expect(response.statusCode).toBe(HttpStatusCode.found);
		expect(response.headers[HeaderTypes.Location]).toBe("https://app.example.com/");
		expect(httpRequestContext.processorState.authOperation).toBe("login");
		expect(httpRequestContext.processorState.authToken).toBe("jwt-token");
	});

	it("should redirect to the failure address without starting a session", async () => {
		completeSignIn.mockResolvedValue({
			location: "https://app.example.com/login?error=oauthFailed"
		});
		const httpRequestContext = {
			serverRequest: { headers: {} },
			processorState: {}
		} as unknown as IHttpRequestContext;

		const response = await oauthCallback(
			httpRequestContext,
			"oauth",
			{ pathParams: { authProviderId: "google" } },
			"/authentication/oauth"
		);

		expect(completeSignIn).toHaveBeenCalledWith("google", CALLBACK_URL, {}, undefined);
		expect(response.headers[HeaderTypes.Location]).toBe(
			"https://app.example.com/login?error=oauthFailed"
		);
		expect(httpRequestContext.processorState.authOperation).toBeUndefined();
		expect(response.headers[HeaderTypes.SetCookie]).toContain(`${OAUTH_TRANSACTION_COOKIE}=;`);
	});
});
