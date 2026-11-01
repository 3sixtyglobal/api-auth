// Copyright 2026 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { GuardError } from "@3sixty/core";
import { HttpMethod } from "@3sixty/web";
import { EntityStorageAuthenticationRestClient } from "../src/entityStorageAuthenticationRestClient.js";
import {
	jsonResponse,
	noContentResponse,
	setupFetchMock,
	teardownFetchMock
} from "./helpers/restClientTestHelpers.js";

// OpenAPI spec: ../../api-auth-entity-storage-service/docs/open-api/spec.json
const ENDPOINT = "http://localhost:8080";
const PREFIX = "authentication";

const fetchMock = vi.fn();

describe("EntityStorageAuthenticationRestClient", () => {
	let client: EntityStorageAuthenticationRestClient;

	beforeEach(() => {
		setupFetchMock(fetchMock);
		client = new EntityStorageAuthenticationRestClient({ endpoint: ENDPOINT });
	});

	afterEach(() => {
		teardownFetchMock(fetchMock);
	});

	describe("login", () => {
		test("throws when email is empty", async () => {
			await expect(client.login("", "MyPassword123!")).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("throws when password is empty", async () => {
			await expect(client.login("user@example.com", "")).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("sends POST to /login with credentials in the body", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse({ expiry: 1722514341067 }));

			await client.login("user@example.com", "MyPassword123!");

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/login`);
			expect(options.method).toBe(HttpMethod.POST);
			const body = JSON.parse(options.body);
			expect(body.email).toBe("user@example.com");
			expect(body.password).toBe("MyPassword123!");
		});

		test("returns expiry from the response body", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse({ expiry: 1722514341067 }));

			const result = await client.login("user@example.com", "MyPassword123!");

			expect(result.expiry).toBe(1722514341067);
		});

		test("returns token as undefined when no Set-Cookie header is present", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse({ expiry: 1722514341067 }));

			const result = await client.login("user@example.com", "MyPassword123!");

			expect(result.token).toBeUndefined();
		});
	});

	describe("loginWithProvider", () => {
		test("throws when the provider id is empty", async () => {
			await expect(client.loginWithProvider("", { code: "code-1" })).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("throws when the credentials are not an object", async () => {
			await expect(client.loginWithProvider("google", undefined)).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.objectUndefined"
			});
		});

		test("sends POST to /login/:authProviderId with the credentials as the body", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse({ expiry: 1722514341067 }));

			const result = await client.loginWithProvider("google", { code: "code-1" });

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/login/google`);
			expect(options.method).toBe(HttpMethod.POST);
			expect(JSON.parse(options.body)).toEqual({ code: "code-1" });
			expect(result.expiry).toBe(1722514341067);
			expect(result.profileReadOnly).toBe(false);
		});

		test("returns the profile and whether the provider owns it", async () => {
			const profile = { "@context": "https://schema.org", "@type": "Person", givenName: "Ada" };
			fetchMock.mockResolvedValueOnce(
				jsonResponse({
					expiry: 1722514341067,
					profile,
					profileReadOnly: true,
					profileEditUrl: "https://myaccount.google.com/personal-info",
					passwordChangeUrl: "https://myaccount.google.com/signinoptions/password"
				})
			);

			const result = await client.loginWithProvider("google", { code: "code-1" });

			expect(result).toMatchObject({
				profile,
				profileReadOnly: true,
				profileEditUrl: "https://myaccount.google.com/personal-info",
				passwordChangeUrl: "https://myaccount.google.com/signinoptions/password"
			});
		});
	});

	describe("register", () => {
		test("sends POST to /register with the details and resolves when accepted", async () => {
			fetchMock.mockResolvedValueOnce({
				ok: true,
				status: 202,
				headers: new Headers(),
				arrayBuffer: async () => new ArrayBuffer(0)
			});

			await expect(
				client.register({
					email: "user@example.com",
					password: "MyPassword123!",
					givenName: "Jane"
				})
			).resolves.toBeUndefined();

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/register`);
			expect(options.method).toBe(HttpMethod.POST);
			expect(JSON.parse(options.body)).toEqual({
				email: "user@example.com",
				password: "MyPassword123!",
				givenName: "Jane"
			});
		});

		test("throws when the details are missing", async () => {
			await expect(client.register(undefined as never)).rejects.toMatchObject({
				name: GuardError.CLASS_NAME
			});
		});
	});

	describe("verifyRegistration", () => {
		test("sends POST to /register/verify with the token", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await client.verifyRegistration("token-1");

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/register/verify`);
			expect(options.method).toBe(HttpMethod.POST);
			expect(JSON.parse(options.body)).toEqual({ token: "token-1" });
		});

		test("throws when the token is missing", async () => {
			await expect(client.verifyRegistration("")).rejects.toMatchObject({
				name: GuardError.CLASS_NAME
			});
		});
	});

	describe("me", () => {
		test("sends GET to /me and returns the account", async () => {
			const account = {
				accountId: "account-1",
				email: "user@example.com",
				authProviderId: "google",
				profileReadOnly: true
			};
			fetchMock.mockResolvedValueOnce(jsonResponse(account));

			const result = await client.me();

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/me`);
			expect(options.method).toBe(HttpMethod.GET);
			expect(result).toEqual(account);
		});
	});

	describe("providers", () => {
		test("sends GET to /providers and returns the provider details", async () => {
			const details = [
				{
					authProviderId: "entity-storage",
					signInMethod: "password",
					passwordChange: "api",
					profileReadOnly: false
				}
			];
			fetchMock.mockResolvedValueOnce(jsonResponse({ providers: details }));

			const providers = await client.providers();

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/providers`);
			expect(options.method).toBe(HttpMethod.GET);
			expect(providers).toEqual(details);
		});
	});

	describe("logout", () => {
		test("sends POST to /logout", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await client.logout();

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/logout`);
			expect(options.method).toBe(HttpMethod.POST);
		});

		test("sends the token in the body when supplied", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await client.logout("eyJhbGciOiJIU...sw5c");

			const [, options] = fetchMock.mock.calls[0];
			expect(JSON.parse(options.body).token).toBe("eyJhbGciOiJIU...sw5c");
		});

		test("sends undefined token in the body when not supplied", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await client.logout();

			const [, options] = fetchMock.mock.calls[0];
			expect(JSON.parse(options.body).token).toBeUndefined();
		});

		test("resolves without a return value", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());
			await expect(client.logout()).resolves.toBeUndefined();
		});
	});

	describe("refresh", () => {
		test("sends POST to /refresh", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse({ expiry: 1722514341067 }));

			await client.refresh();

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/refresh`);
			expect(options.method).toBe(HttpMethod.POST);
		});

		test("sends the token in the body when supplied", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse({ expiry: 1722514341067 }));

			await client.refresh("eyJhbGciOiJIU...sw5c");

			const [, options] = fetchMock.mock.calls[0];
			expect(JSON.parse(options.body).token).toBe("eyJhbGciOiJIU...sw5c");
		});

		test("sends undefined token in the body when not supplied", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse({ expiry: 1722514341067 }));

			await client.refresh();

			const [, options] = fetchMock.mock.calls[0];
			expect(JSON.parse(options.body).token).toBeUndefined();
		});

		test("returns expiry from the response body", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse({ expiry: 1722514341067 }));

			const result = await client.refresh();

			expect(result.expiry).toBe(1722514341067);
		});

		test("returns token as undefined when no Set-Cookie header is present", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse({ expiry: 1722514341067 }));

			const result = await client.refresh();

			expect(result.token).toBeUndefined();
		});
	});

	describe("updatePassword", () => {
		test("throws when currentPassword is empty", async () => {
			await expect(client.updatePassword("", "MyNewPassword123!")).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("throws when newPassword is empty", async () => {
			await expect(client.updatePassword("MyPassword123!", "")).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("sends PUT to /password with both passwords in the body", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse({ token: "new-token", expiry: 1722514341067 }));

			await client.updatePassword("MyPassword123!", "MyNewPassword123!");

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/password`);
			expect(options.method).toBe(HttpMethod.PUT);
			const body = JSON.parse(options.body);
			expect(body.currentPassword).toBe("MyPassword123!");
			expect(body.newPassword).toBe("MyNewPassword123!");
		});

		test("returns the new token and expiry from the response body", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse({ token: "new-token", expiry: 1722514341067 }));

			await expect(client.updatePassword("MyPassword123!", "MyNewPassword123!")).resolves.toEqual({
				token: "new-token",
				expiry: 1722514341067
			});
		});

		test("returns token as undefined when neither the body nor a Set-Cookie header has one", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse({ expiry: 1722514341067 }));

			await expect(client.updatePassword("MyPassword123!", "MyNewPassword123!")).resolves.toEqual({
				token: undefined,
				expiry: 1722514341067
			});
		});
	});

	describe("passwordPolicy", () => {
		test("sends GET to /policy", async () => {
			fetchMock.mockResolvedValueOnce(
				jsonResponse({ minPasswordLength: 15, maxPasswordLength: 128 })
			);

			await client.passwordPolicy();

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/policy`);
			expect(options.method).toBe(HttpMethod.GET);
		});

		test("returns the policy from the response body", async () => {
			fetchMock.mockResolvedValueOnce(
				jsonResponse({ minPasswordLength: 15, maxPasswordLength: 128 })
			);

			const result = await client.passwordPolicy();

			expect(result).toEqual({ minPasswordLength: 15, maxPasswordLength: 128 });
		});
	});

	describe("forgotPassword", () => {
		test("throws when the email is empty", async () => {
			await expect(client.forgotPassword("")).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("sends POST to /password/forgot with the email", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await client.forgotPassword("user@example.com");

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/password/forgot`);
			expect(options.method).toBe(HttpMethod.POST);
			expect(JSON.parse(options.body)).toEqual({ email: "user@example.com" });
		});
	});

	describe("resetPassword", () => {
		test("throws when the token is empty", async () => {
			await expect(client.resetPassword("", "MyNewPassword123!")).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("sends POST to /password/reset with the token and new password", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await client.resetPassword("token-1", "MyNewPassword123!");

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/password/reset`);
			expect(options.method).toBe(HttpMethod.POST);
			expect(JSON.parse(options.body)).toEqual({
				token: "token-1",
				newPassword: "MyNewPassword123!"
			});
		});
	});

	describe("removeAccount", () => {
		test("sends DELETE to /me", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await client.removeAccount();

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/me`);
			expect(options.method).toBe(HttpMethod.DELETE);
		});
	});
});
