// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { GuardError } from "@twin.org/core";
import { HttpMethod } from "@twin.org/web";
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
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await client.updatePassword("MyPassword123!", "MyNewPassword123!");

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/password`);
			expect(options.method).toBe(HttpMethod.PUT);
			const body = JSON.parse(options.body);
			expect(body.currentPassword).toBe("MyPassword123!");
			expect(body.newPassword).toBe("MyNewPassword123!");
		});

		test("resolves without a return value", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());
			await expect(
				client.updatePassword("MyPassword123!", "MyNewPassword123!")
			).resolves.toBeUndefined();
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
});
