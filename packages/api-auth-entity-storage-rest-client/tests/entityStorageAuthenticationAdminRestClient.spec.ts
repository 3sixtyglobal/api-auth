// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { GuardError } from "@twin.org/core";
import { HttpMethod } from "@twin.org/web";
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
	userIdentity: "did:example:123456789abcdefghi",
	organizationIdentity: "did:example:123456789abcdefghi",
	scope: ["scope1", "scope2"]
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
			await expect(
				client.create({ ...TEST_USER, email: "", password: "MyPassword123!" })
			).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("sends POST to /users", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await client.create({ ...TEST_USER, password: "MyPassword123!" });

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/users`);
			expect(options.method).toBe(HttpMethod.POST);
		});

		test("sends the full user object including password as the request body", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			const createUser = { ...TEST_USER, password: "MyPassword123!" };
			await client.create(createUser);

			const [, options] = fetchMock.mock.calls[0];
			expect(JSON.parse(options.body)).toEqual(createUser);
		});

		test("resolves without a return value", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());
			await expect(
				client.create({ ...TEST_USER, password: "MyPassword123!" })
			).resolves.toBeUndefined();
		});
	});

	describe("update", () => {
		test("throws when user is undefined", async () => {
			await expect(client.update(undefined as never)).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.objectUndefined"
			});
		});

		test("throws when user.email is empty", async () => {
			await expect(client.update({ email: "" })).rejects.toMatchObject({
				name: GuardError.CLASS_NAME,
				message: "guard.stringEmpty"
			});
		});

		test("sends PUT to /users/:email with email substituted in path", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await client.update(TEST_USER);

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/users/${TEST_USER.email}`);
			expect(options.method).toBe(HttpMethod.PUT);
		});

		test("sends the user object as the request body", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await client.update(TEST_USER);

			const [, options] = fetchMock.mock.calls[0];
			expect(JSON.parse(options.body)).toEqual(TEST_USER);
		});

		test("resolves without a return value", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());
			await expect(client.update(TEST_USER)).resolves.toBeUndefined();
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

		test("sends GET to /users/identity/:identity with identity substituted in path", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_USER));

			await client.getByIdentity(TEST_USER.userIdentity);

			const [url, options] = fetchMock.mock.calls[0];
			expect(url).toBe(`${ENDPOINT}/${PREFIX}/users/identity/${TEST_USER.userIdentity}`);
			expect(options.method).toBe(HttpMethod.GET);
		});

		test("returns the user from the response body", async () => {
			fetchMock.mockResolvedValueOnce(jsonResponse(TEST_USER));

			const result = await client.getByIdentity(TEST_USER.userIdentity);

			expect(result).toEqual(TEST_USER);
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

		test("sends newPassword in the request body and omits currentPassword when not supplied", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await client.updatePassword(TEST_USER.email, "MyNewPassword123!");

			const [, options] = fetchMock.mock.calls[0];
			const body = JSON.parse(options.body);
			expect(body.newPassword).toBe("MyNewPassword123!");
			expect(body.currentPassword).toBeUndefined();
		});

		test("includes currentPassword in the request body when supplied", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());

			await client.updatePassword(TEST_USER.email, "MyNewPassword123!", "MyPassword123!");

			const [, options] = fetchMock.mock.calls[0];
			const body = JSON.parse(options.body);
			expect(body.newPassword).toBe("MyNewPassword123!");
			expect(body.currentPassword).toBe("MyPassword123!");
		});

		test("resolves without a return value", async () => {
			fetchMock.mockResolvedValueOnce(noContentResponse());
			await expect(
				client.updatePassword(TEST_USER.email, "MyNewPassword123!")
			).resolves.toBeUndefined();
		});
	});
});
