// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

import { type ITokenRequest, OAuthParameter } from "@3sixty/api-auth-entity-storage-models";
import { ForbiddenError, HttpErrorHelper, type IHttpRequestContext } from "@3sixty/api-models";
import { ComponentFactory, GeneralError, UnauthorizedError } from "@3sixty/core";
import { HttpStatusCode } from "@3sixty/web";
import {
	authenticationAdminGetUserByIdentity,
	authenticationAdminUpdateUser,
	generateRestRoutesAuthenticationAdmin
} from "../../src/routes/entityStorageAuthenticationAdminRoutes.js";
import {
	authenticationAuthorizationServerMetadata,
	authenticationAuthorize,
	authenticationLoginWithProvider,
	authenticationMe,
	authenticationPasswordForgot,
	authenticationPasswordReset,
	authenticationProviders,
	authenticationRegister,
	authenticationRegisterVerify,
	authenticationRemoveAccount,
	authenticationToken,
	authenticationUpdatePassword,
	generateRestRoutesAuthentication
} from "../../src/routes/entityStorageAuthenticationRoutes.js";

describe("generateRestRoutesAuthentication", () => {
	it("should keep the password update authenticated without an authorization subject", () => {
		const routes = generateRestRoutesAuthentication("/authentication", "authentication");
		const updatePassword = routes.find(
			route => route.operationId === "authenticationUpdatePassword"
		);

		expect(updatePassword?.requiresAuthorization).toBe(false);
		expect(updatePassword?.skipAuth).toBeUndefined();
	});

	it("should return the new token in the body for a bearer password change", async () => {
		const updatePassword = vi.fn().mockResolvedValue({ token: "new-jwt", expiry: 123 });
		const component = { className: () => "authentication", updatePassword };
		vi.spyOn(ComponentFactory, "get").mockReturnValue(component);
		const httpRequestContext = {
			serverRequest: { headers: {} },
			processorState: {
				authToken: "old-jwt",
				authTokenLocation: "authorization",
				authSessionStart: 1700000000
			}
		} as unknown as IHttpRequestContext;

		const result = await authenticationUpdatePassword(httpRequestContext, "authentication", {
			body: { currentPassword: "MyPassword123!", newPassword: "MyNewPassword123!" }
		});

		// The session start the auth processor read from the token is passed on.
		expect(updatePassword).toHaveBeenCalledWith(
			"MyPassword123!",
			"MyNewPassword123!",
			"old-jwt",
			1700000000
		);
		expect(result.body).toEqual({ token: "new-jwt", expiry: 123 });
		expect(httpRequestContext.processorState.authOperation).toBe("refresh");
		expect(httpRequestContext.processorState.authToken).toBe("new-jwt");
	});

	it("should leave the new token to the cookie for a cookie password change", async () => {
		const updatePassword = vi.fn().mockResolvedValue({ token: "new-jwt", expiry: 123 });
		const component = { className: () => "authentication", updatePassword };
		vi.spyOn(ComponentFactory, "get").mockReturnValue(component);
		const httpRequestContext = {
			serverRequest: { headers: {} },
			processorState: { authToken: "old-jwt", authTokenLocation: "cookie" }
		} as unknown as IHttpRequestContext;

		const result = await authenticationUpdatePassword(httpRequestContext, "authentication", {
			body: { currentPassword: "MyPassword123!", newPassword: "MyNewPassword123!" }
		});

		expect(result.body).toEqual({ token: undefined, expiry: 123 });
		expect(httpRequestContext.processorState.authOperation).toBe("refresh");
		expect(httpRequestContext.processorState.authToken).toBe("new-jwt");
	});

	it("should map a wrong current password to forbidden", async () => {
		const updatePassword = vi
			.fn()
			.mockRejectedValue(new ForbiddenError("passwordHelper", "currentPasswordMismatch"));
		const component = { className: () => "authentication", updatePassword };
		vi.spyOn(ComponentFactory, "get").mockReturnValue(component);
		const httpRequestContext = {
			serverRequest: { headers: {} },
			processorState: {}
		} as unknown as IHttpRequestContext;

		const error = await authenticationUpdatePassword(httpRequestContext, "authentication", {
			body: { currentPassword: "wrong", newPassword: "MyNewPassword123!" }
		}).catch(err => err);

		expect(HttpErrorHelper.processError(error).httpStatusCode).toBe(HttpStatusCode.forbidden);
		expect(httpRequestContext.processorState.authOperation).toBeUndefined();
	});

	it("should not expose an identity adoption route", () => {
		const routes = generateRestRoutesAuthentication("/authentication", "authentication");

		expect(routes.map(route => route.operationId)).toEqual([
			"authenticationLogin",
			"authenticationAuthorize",
			"authenticationToken",
			"authenticationAuthorizationServerMetadata",
			"authenticationLoginWithProvider",
			"authenticationRegister",
			"authenticationRegisterVerify",
			"authenticationMe",
			"authenticationRemoveAccount",
			"authenticationLogout",
			"authenticationRefreshToken",
			"authenticationUpdatePassword",
			"authenticationPasswordForgot",
			"authenticationPasswordReset",
			"authenticationPasswordPolicy",
			"authenticationProviders"
		]);
	});

	it("should login through a provider and hand the token to the auth processor", async () => {
		const loginWithProvider = vi.fn().mockResolvedValue({ token: "jwt", expiry: 123 });
		const component = { className: () => "authentication", loginWithProvider };
		vi.spyOn(ComponentFactory, "get").mockReturnValue(component);
		const httpRequestContext = {
			serverRequest: { headers: {} },
			processorState: {}
		} as unknown as IHttpRequestContext;

		const result = await authenticationLoginWithProvider(httpRequestContext, "authentication", {
			pathParams: { authProviderId: "google" },
			body: { code: "code-1", nonce: "nonce-1" }
		});

		expect(loginWithProvider).toHaveBeenCalledWith("google", { code: "code-1", nonce: "nonce-1" });
		expect(result.body.expiry).toBe(123);
		expect(httpRequestContext.processorState.authOperation).toBe("login");
		expect(httpRequestContext.processorState.authToken).toBe("jwt");
	});

	it("should require a nonce to login through a provider", async () => {
		const loginWithProvider = vi.fn();
		const component = { className: () => "authentication", loginWithProvider };
		vi.spyOn(ComponentFactory, "get").mockReturnValue(component);
		const httpRequestContext = {
			serverRequest: { headers: {} },
			processorState: {}
		} as unknown as IHttpRequestContext;

		await expect(
			authenticationLoginWithProvider(httpRequestContext, "authentication", {
				pathParams: { authProviderId: "google" },
				body: { code: "code-1" }
			})
		).rejects.toMatchObject({ name: "GuardError" });
		expect(loginWithProvider).not.toHaveBeenCalled();
	});

	it("should issue an authorization code as a public route without starting a session", async () => {
		const routes = generateRestRoutesAuthentication("/authentication", "authentication");
		const route = routes.find(r => r.operationId === "authenticationAuthorize");
		expect(route?.method).toBe("POST");
		expect(route?.path).toBe("/authentication/authorize");
		expect(route?.skipAuth).toBe(true);

		const authorize = vi.fn().mockResolvedValue("https://node.example.com/callback?code=c&state=s");
		const component = { className: () => "authentication", authorize };
		vi.spyOn(ComponentFactory, "get").mockReturnValue(component);
		const httpRequestContext = {
			serverRequest: { headers: {} },
			processorState: {}
		} as unknown as IHttpRequestContext;
		const authorization = {
			state: "s",
			nonce: "n",
			codeChallenge: "challenge",
			codeChallengeMethod: "S256",
			redirectUri: "https://node.example.com/callback"
		};

		const result = await authenticationAuthorize(httpRequestContext, "authentication", {
			body: { email: "user@example.com", password: "MyPassword123!", ...authorization }
		});

		expect(authorize).toHaveBeenCalledWith("user@example.com", "MyPassword123!", authorization);
		expect(result.body.location).toBe("https://node.example.com/callback?code=c&state=s");
		expect(httpRequestContext.processorState.authOperation).toBeUndefined();
	});

	describe("token endpoint", () => {
		const noStore = { "cache-control": "no-store" };
		const accessToken = {
			[OAuthParameter.AccessToken]: "jwt",
			[OAuthParameter.TokenType]: "Bearer",
			[OAuthParameter.ExpiresIn]: 3600
		};
		const validBody: ITokenRequest["body"] = {
			[OAuthParameter.GrantType]: "authorization_code",
			[OAuthParameter.Code]: "code-1",
			[OAuthParameter.RedirectUri]: "https://app.example.com/callback",
			[OAuthParameter.CodeVerifier]: "verifier-1"
		};

		it("should be a public form route", () => {
			const routes = generateRestRoutesAuthentication("/authentication", "authentication");
			const route = routes.find(r => r.operationId === "authenticationToken");

			expect(route?.method).toBe("POST");
			expect(route?.path).toBe("/authentication/token");
			expect(route?.skipAuth).toBe(true);
			expect(route?.requestType?.mimeType).toBe("application/x-www-form-urlencoded");
		});

		it("should exchange the code and stop the token being cached", async () => {
			const exchangeAuthorizationCode = vi.fn().mockResolvedValue(accessToken);
			const component = { className: () => "authentication", exchangeAuthorizationCode };
			vi.spyOn(ComponentFactory, "get").mockReturnValue(component);

			const result = await authenticationToken(
				{} as unknown as IHttpRequestContext,
				"authentication",
				{ body: validBody }
			);

			expect(exchangeAuthorizationCode).toHaveBeenCalledWith(
				"code-1",
				"verifier-1",
				"https://app.example.com/callback"
			);
			expect(result).toEqual({ headers: noStore, body: accessToken });
		});

		it.each([
			{
				reason: "another grant type",
				error: "unsupported_grant_type",
				change: { [OAuthParameter.GrantType]: "password" }
			},
			{
				reason: "no grant type",
				error: "invalid_request",
				change: { [OAuthParameter.GrantType]: "" }
			},
			{ reason: "no code", error: "invalid_request", change: { [OAuthParameter.Code]: "" } },
			{
				reason: "no code verifier",
				error: "invalid_request",
				change: { [OAuthParameter.CodeVerifier]: "" }
			}
		])("should refuse a request with $reason", async ({ error, change }) => {
			const exchangeAuthorizationCode = vi.fn();
			const component = { className: () => "authentication", exchangeAuthorizationCode };
			vi.spyOn(ComponentFactory, "get").mockReturnValue(component);

			const result = await authenticationToken(
				{} as unknown as IHttpRequestContext,
				"authentication",
				{ body: { ...validBody, ...change } }
			);

			expect(result).toEqual({ statusCode: 400, headers: noStore, body: { error } });
			expect(exchangeAuthorizationCode).not.toHaveBeenCalled();
		});

		it("should answer invalid_grant for a code that is not valid", async () => {
			const component = {
				className: () => "authentication",
				exchangeAuthorizationCode: vi
					.fn()
					.mockRejectedValue(new UnauthorizedError("test", "authorizationCodeInvalid"))
			};
			vi.spyOn(ComponentFactory, "get").mockReturnValue(component);

			const result = await authenticationToken(
				{} as unknown as IHttpRequestContext,
				"authentication",
				{ body: validBody }
			);

			expect(result).toMatchObject({ statusCode: 400, body: { error: "invalid_grant" } });
		});

		it("should not hide an unexpected failure as invalid_grant", async () => {
			const component = {
				className: () => "authentication",
				exchangeAuthorizationCode: vi
					.fn()
					.mockRejectedValue(new GeneralError("test", "nodeIdNotSet"))
			};
			vi.spyOn(ComponentFactory, "get").mockReturnValue(component);

			await expect(
				authenticationToken({} as unknown as IHttpRequestContext, "authentication", {
					body: validBody
				})
			).rejects.toThrow(GeneralError);
		});
	});

	it("should serve the authorization server metadata at the well-known address", async () => {
		const routes = generateRestRoutesAuthentication("/authentication", "authentication");
		const route = routes.find(r => r.operationId === "authenticationAuthorizationServerMetadata");
		expect(route?.method).toBe("GET");
		expect(route?.path).toBe("/.well-known/oauth-authorization-server");
		expect(route?.skipAuth).toBe(true);

		const metadata = { issuer: "https://node.example.com" };
		const component = {
			className: () => "authentication",
			authorizationServerMetadata: vi.fn().mockResolvedValue(metadata)
		};
		vi.spyOn(ComponentFactory, "get").mockReturnValue(component);

		const result = await authenticationAuthorizationServerMetadata(
			{} as unknown as IHttpRequestContext,
			"authentication",
			{}
		);

		expect(result.body).toEqual(metadata);
	});

	it("should pass the requested provider types to the component", async () => {
		const providers = vi.fn().mockResolvedValue([]);
		const component = { className: () => "authentication", providers };
		vi.spyOn(ComponentFactory, "get").mockReturnValue(component);

		await authenticationProviders({} as unknown as IHttpRequestContext, "authentication", {
			query: { types: "oauth2,basic" }
		});
		await authenticationProviders({} as unknown as IHttpRequestContext, "authentication", {});

		expect(providers).toHaveBeenNthCalledWith(1, ["oauth2", "basic"]);
		expect(providers).toHaveBeenNthCalledWith(2, undefined);
	});

	it("should keep the sign up public and the signed in account unauthorized by role", () => {
		const routes = generateRestRoutesAuthentication("/authentication", "authentication");
		const register = routes.find(route => route.operationId === "authenticationRegister");
		const me = routes.find(route => route.operationId === "authenticationMe");

		expect(register?.skipAuth).toBe(true);
		expect(me?.requiresAuthorization).toBe(false);
		expect(me?.skipAuth).toBeUndefined();
	});

	it("should accept a sign up without a body or a token", async () => {
		const register = vi.fn().mockResolvedValue(undefined);
		const component = { className: () => "authentication", register };
		vi.spyOn(ComponentFactory, "get").mockReturnValue(component);
		const httpRequestContext = {
			serverRequest: { headers: {} },
			processorState: {}
		} as unknown as IHttpRequestContext;

		const result = await authenticationRegister(httpRequestContext, "authentication", {
			body: { email: "user@example.com", password: "MyPassword123!" }
		});

		expect(result).toEqual({ statusCode: 202 });
		expect(httpRequestContext.processorState.authOperation).toBeUndefined();
	});

	it("should verify a sign up with the token as a public route", async () => {
		const routes = generateRestRoutesAuthentication("/authentication", "authentication");
		const verify = routes.find(route => route.operationId === "authenticationRegisterVerify");
		expect(verify?.skipAuth).toBe(true);
		expect(verify?.method).toBe("POST");
		expect(verify?.path).toBe("/authentication/register/verify");

		const verifyRegistration = vi.fn().mockResolvedValue(undefined);
		const component = { className: () => "authentication", verifyRegistration };
		vi.spyOn(ComponentFactory, "get").mockReturnValue(component);

		const result = await authenticationRegisterVerify(
			{} as unknown as IHttpRequestContext,
			"authentication",
			{ body: { token: "token-1" } }
		);

		expect(verifyRegistration).toHaveBeenCalledWith("token-1");
		expect(result.statusCode).toBe(204);
	});

	it("should return the signed in account", async () => {
		const summary = {
			accountId: "account-1",
			email: "user@example.com",
			authProviderId: "3sixty",
			profileReadOnly: false
		};
		const component = { className: () => "authentication", me: vi.fn().mockResolvedValue(summary) };
		vi.spyOn(ComponentFactory, "get").mockReturnValue(component);

		const result = await authenticationMe(
			{} as unknown as IHttpRequestContext,
			"authentication",
			{}
		);

		expect(result.body).toEqual(summary);
	});

	it("should keep the password reset routes public and the account removal signed in", () => {
		const routes = generateRestRoutesAuthentication("/authentication", "authentication");
		const forgot = routes.find(route => route.operationId === "authenticationPasswordForgot");
		const reset = routes.find(route => route.operationId === "authenticationPasswordReset");
		const removeAccount = routes.find(route => route.operationId === "authenticationRemoveAccount");

		expect(forgot?.skipAuth).toBe(true);
		expect(forgot?.path).toBe("/authentication/password/forgot");
		expect(reset?.skipAuth).toBe(true);
		expect(reset?.path).toBe("/authentication/password/reset");
		expect(removeAccount?.method).toBe("DELETE");
		expect(removeAccount?.path).toBe("/authentication/me");
		expect(removeAccount?.requiresAuthorization).toBe(false);
		expect(removeAccount?.skipAuth).toBeUndefined();
	});

	it("should answer a forgotten password request with no content", async () => {
		const forgotPassword = vi.fn().mockResolvedValue(undefined);
		const component = { className: () => "authentication", forgotPassword };
		vi.spyOn(ComponentFactory, "get").mockReturnValue(component);

		const result = await authenticationPasswordForgot(
			{} as unknown as IHttpRequestContext,
			"authentication",
			{ body: { email: "user@example.com" } }
		);

		expect(forgotPassword).toHaveBeenCalledWith("user@example.com");
		expect(result.statusCode).toBe(204);
	});

	it("should reset a password with the token", async () => {
		const resetPassword = vi.fn().mockResolvedValue(undefined);
		const component = { className: () => "authentication", resetPassword };
		vi.spyOn(ComponentFactory, "get").mockReturnValue(component);

		const result = await authenticationPasswordReset(
			{} as unknown as IHttpRequestContext,
			"authentication",
			{ body: { token: "token-1", newPassword: "MyNewPassword123!" } }
		);

		expect(resetPassword).toHaveBeenCalledWith("token-1", "MyNewPassword123!");
		expect(result.statusCode).toBe(204);
	});

	it("should remove the signed in account and clear the token cookie", async () => {
		const removeAccount = vi.fn().mockResolvedValue(undefined);
		const component = { className: () => "authentication", removeAccount };
		vi.spyOn(ComponentFactory, "get").mockReturnValue(component);
		const httpRequestContext = {
			serverRequest: { headers: {} },
			processorState: { authSessionStart: 1767225600 }
		} as unknown as IHttpRequestContext;

		const result = await authenticationRemoveAccount(httpRequestContext, "authentication", {});

		// The session start is passed on, so only a recent sign in may remove the account.
		expect(removeAccount).toHaveBeenCalledWith(1767225600);
		expect(result.statusCode).toBe(204);
		expect(httpRequestContext.processorState.authOperation).toBe("logout");
	});

	it("should guard the admin user listing, disable and enable routes", () => {
		const routes = generateRestRoutesAuthenticationAdmin("/authentication/admin", "admin");
		const query = routes.find(route => route.operationId === "authenticationAdminQueryUsers");
		const disable = routes.find(route => route.operationId === "authenticationAdminDisableUser");
		const enable = routes.find(route => route.operationId === "authenticationAdminEnableUser");

		expect(query?.path).toBe("/authentication/admin/users");
		expect(query?.defaultAuthorization?.permission).toBe("user-admin:read");
		expect(disable?.path).toBe("/authentication/admin/users/:email/disable");
		expect(disable?.defaultAuthorization?.permission).toBe("user-admin:write");
		expect(enable?.path).toBe("/authentication/admin/users/:email/enable");
		expect(enable?.defaultAuthorization?.permission).toBe("user-admin:write");
	});

	it("should keep the admin user update and get by identity routes", () => {
		const routes = generateRestRoutesAuthenticationAdmin("/authentication/admin", "admin");
		const update = routes.find(route => route.operationId === "authenticationAdminUpdateUser");
		const getByIdentity = routes.find(
			route => route.operationId === "authenticationAdminGetByIdentityUser"
		);

		expect(update?.method).toBe("PUT");
		expect(update?.path).toBe("/authentication/admin/users/:email");
		expect(update?.defaultAuthorization?.permission).toBe("user-admin:write");
		expect(getByIdentity?.method).toBe("GET");
		expect(getByIdentity?.path).toBe("/authentication/admin/users/identity/:identity");
		expect(getByIdentity?.defaultAuthorization?.permission).toBe("user-admin:read");
	});

	it("should update a user and get a user by identity", async () => {
		const user = { email: "user@example.com", accountId: "user-1", userIdentity: "did:example:1" };
		const component = {
			className: () => "admin",
			update: vi.fn(),
			getByIdentity: vi.fn().mockResolvedValue(user)
		};
		vi.spyOn(ComponentFactory, "get").mockReturnValue(component);
		const httpRequestContext = {} as IHttpRequestContext;

		const updated = await authenticationAdminUpdateUser(httpRequestContext, "admin", {
			pathParams: { email: "user@example.com" },
			body: { userIdentity: "did:example:1", organizationIdentity: "did:example:org" }
		});
		const found = await authenticationAdminGetUserByIdentity(httpRequestContext, "admin", {
			pathParams: { identity: "did:example:1" }
		});

		expect(updated.statusCode).toBe(204);
		expect(component.update).toHaveBeenCalledWith({
			email: "user@example.com",
			userIdentity: "did:example:1",
			organizationIdentity: "did:example:org"
		});
		expect(component.getByIdentity).toHaveBeenCalledWith("did:example:1");
		expect(found.body).toEqual(user);
	});

	it("should document the user creation as created with a conflict for an address in use", () => {
		const routes = generateRestRoutesAuthenticationAdmin("/authentication/admin", "admin");
		const create = routes.find(route => route.operationId === "authenticationAdminCreateUser");

		expect(create?.responseType?.map(response => response.type)).toEqual([
			"ICreatedResponse",
			"IUnauthorizedResponse",
			"IConflictResponse"
		]);
	});
});
