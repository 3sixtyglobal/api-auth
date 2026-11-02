// Copyright 2026 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { GuardError } from "@3sixty/core";
import { HttpMethod } from "@3sixty/web";
import { EntityStorageAuthenticationAdminRestClient } from "../src/entityStorageAuthenticationAdminRestClient.js";
import {
	jsonResponse,
	noContentResponse,
	setupFetchMock,
	teardownFetchMock
} from "./helpers/restClientTestHelpers.js";

// OpenAPI spec: ../../api-auth-entity-storage-service/docs/open-api/spec.json
const ENDPOINT = "http://localhost:8080";
const PREFIX = "authentication/admin";

const TEST_USER = {
	email: "user@example.com",
	accountId: "6f1c2c0e-4b7a-4f0e-9c1a-2d3e4f5a6b7c"
};

const fetchMock = vi.fn();

describe("EntityStorageAuthenticationAdminRestClient", () => {
	let client: EntityStorageAuthenticationAdminRestClient;

	beforeEach(() => {
		setupFetchMock(fetchMock);
		client = new EntityStorageAuthenticationAdminRestClient({ endpoint: ENDPOINT });
	});

	afterEach(() => {
		teardownFetchMock(fetchMock);
	});

	describe("create", () => {
		test("throws when user is undefined", async () => {
			await expect(client.create(undefined as never)).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.objectUndefined"
			});
		});

		test("throws when user.email is empty", async () => {
			await expect(client.create({ email: "", password: "MyPassword123!" })).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("sends POST to /users", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await client.create({ email: TEST_USER.email, password: "MyPassword123!" });

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/users`);
			expect(options.method).toBe(HttpMethod.POST);
		});

		test("sends the full user object including password as the request body", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			const createUser = { email: TEST_USER.email, password: "MyPassword123!" };
			await client.create(createUser);

			const [, options] = fetchMock.mock.calls[0];
			expect(JSON.parse(options.body)).toEqual(createUser);
		});

		test("resolves without a return value", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());
			await expect(
				client.create({ email: TEST_USER.email, password: "MyPassword123!" })
			).resolves.toBeUndefined();
		});
	});

	describe("get", () => {
		test("throws when email is empty", async () => {
			await expect(client.get("")).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("sends GET to /users/:email with email substituted in path", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_USER));

			await client.get(TEST_USER.email);

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/users/${TEST_USER.email}`);
			expect(options.method).toBe(HttpMethod.GET);
		});

		test("returns the user from the response body", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_USER));

			const result = await client.get(TEST_USER.email);

			expect(result).toEqual(TEST_USER);
		});
	});

	describe("getByIdentity", () => {
		test("throws when identity is empty", async () => {
			await expect(client.getByIdentity("")).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("sends GET to /users/identity/:identity and returns the user", async () => {
			const user = { ...TEST_USER, userIdentity: "did:example:123" };
			fetchMock.mockResolvedValueOnce(jsonResponse(user));

			const result = await client.getByIdentity("did:example:123");

			const [url, options] = fetchMock.mock.calls[0];
			expect(decodeURIComponent(url)).toBe(`${ENDPOINT}/${PREFIX}/users/identity/did:example:123`);
			expect(options.method).toBe(HttpMethod.GET);
			expect(result).toEqual(user);
		});
	});

	describe("update", () => {
		test("throws when user.email is empty", async () => {
			await expect(client.update({ email: "" })).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("sends PUT to /users/:email with the identity and organization", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await client.update({
				email: TEST_USER.email,
				userIdentity: "did:example:user",
				organizationIdentity: "did:example:org"
			});

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/users/${TEST_USER.email}`);
			expect(options.method).toBe(HttpMethod.PUT);
			expect(JSON.parse(options.body)).toEqual({
				userIdentity: "did:example:user",
				organizationIdentity: "did:example:org"
			});
		});
	});

	describe("remove", () => {
		test("throws when email is empty", async () => {
			await expect(client.remove("")).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("sends DELETE to /users/:email with email substituted in path", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await client.remove(TEST_USER.email);

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/users/${TEST_USER.email}`);
			expect(options.method).toBe(HttpMethod.DELETE);
		});

		test("resolves without a return value", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());
			await expect(client.remove(TEST_USER.email)).resolves.toBeUndefined();
		});
	});

	describe("updatePassword", () => {
		test("throws when email is empty", async () => {
			await expect(client.updatePassword("", "MyNewPassword123!")).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("throws when newPassword is empty", async () => {
			await expect(client.updatePassword(TEST_USER.email, "")).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("sends PUT to /users/:email/password with email substituted in path", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await client.updatePassword(TEST_USER.email, "MyNewPassword123!");

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/users/${TEST_USER.email}/password`);
			expect(options.method).toBe(HttpMethod.PUT);
		});

		test("sends only newPassword in the request body", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await client.updatePassword(TEST_USER.email, "MyNewPassword123!");

			const [, options] = fetchMock.mock.calls[0];
			const body = JSON.parse(options.body);
			expect(body).toEqual({ newPassword: "MyNewPassword123!" });
		});

		test("resolves without a return value", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());
			await expect(
				client.updatePassword(TEST_USER.email, "MyNewPassword123!")
			).resolves.toBeUndefined();
		});
	});

	describe("query", () => {
		test("sends GET to /users with the filters as query parameters", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse({ entities: [TEST_USER], cursor: "c2" }));

			const result = await client.query("user@", true, "entity-storage", "c1", 10);

			const [url, options] = fetchMock.mock.calls[0];
			const parsed = new URL(url);
			expect(`${parsed.origin}${parsed.pathname}`).toBe(`${ENDPOINT}/${PREFIX}/users`);
			expect(parsed.searchParams.get("email")).toBe("user@");
			expect(parsed.searchParams.get("exactEmail")).toBe("true");
			expect(parsed.searchParams.get("authProviderId")).toBe("entity-storage");
			expect(parsed.searchParams.get("cursor")).toBe("c1");
			expect(parsed.searchParams.get("limit")).toBe("10");
			expect(options.method).toBe(HttpMethod.GET);
			expect(result).toEqual({ entities: [TEST_USER], cursor: "c2" });
		});
	});

	describe("disable", () => {
		test("throws when email is empty", async () => {
			await expect(client.disable("")).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("sends POST to /users/:email/disable", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await client.disable(TEST_USER.email);

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/users/${TEST_USER.email}/disable`);
			expect(options.method).toBe(HttpMethod.POST);
		});
	});

	describe("enable", () => {
		test("throws when email is empty", async () => {
			await expect(client.enable("")).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("sends POST to /users/:email/enable", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await client.enable(TEST_USER.email);

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/users/${TEST_USER.email}/enable`);
			expect(options.method).toBe(HttpMethod.POST);
		});
	});
});
