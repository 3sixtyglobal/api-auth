// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { GuardError } from "@3sixty/core";
import { HttpMethod } from "@3sixty/web";
import {
	jsonResponse,
	noContentResponse,
	setupFetchMock,
	teardownFetchMock
} from "./helpers/restClientTestHelpers.js";
import { EntityStorageAuthenticationAccountRestClient } from "../src/entityStorageAuthenticationAccountRestClient.js";
import { OrganizationRequestAdminRestClient } from "../src/organizationRequestAdminRestClient.js";

const ENDPOINT = "http://localhost:8080";
const REQUEST = {
	id: "request-1",
	accountId: "account-1",
	organization: "did:example:org",
	status: "pending",
	dateCreated: "2026-01-12T09:05:23.123Z",
	dateModified: "2026-01-12T09:05:23.123Z"
};

const fetchMock = vi.fn();

describe("OrganizationRequestAdminRestClient", () => {
	const prefix = "authentication/admin/organization-request";
	let client: OrganizationRequestAdminRestClient;

	beforeEach(() => {
		setupFetchMock(fetchMock);
		client = new OrganizationRequestAdminRestClient({ endpoint: ENDPOINT });
	});

	afterEach(() => {
		teardownFetchMock(fetchMock);
	});

	test("gets and queries the requests", async () => {
		fetchMock
			.mockResolvedValueOnce(jsonResponse(REQUEST))
			.mockResolvedValueOnce(jsonResponse({ entities: [REQUEST], cursor: "next" }));

		await expect(client.get("request-1")).resolves.toEqual(REQUEST);
		await expect(client.query("pending", "did:example:org", "c1", 5)).resolves.toEqual({
			entities: [REQUEST],
			cursor: "next"
		});

		expect(fetchMock.mock.calls[0][0]).toBe(`${ENDPOINT}/${prefix}/request-1`);
		const url = new URL(fetchMock.mock.calls[1][0]);
		expect(url.pathname).toBe(`/${prefix}`);
		expect(Object.fromEntries(url.searchParams)).toEqual({
			status: "pending",
			filterOrganization: "did:example:org",
			cursor: "c1",
			limit: "5"
		});
	});

	test("counts the requests of a status", async () => {
		fetchMock.mockResolvedValueOnce(jsonResponse({ count: 1000, capped: true }));

		await expect(client.countRequests("pending", "did:example:org")).resolves.toEqual({
			count: 1000,
			capped: true
		});

		const url = new URL(fetchMock.mock.calls[0][0]);
		expect(url.pathname).toBe(`/${prefix}/count`);
		expect(Object.fromEntries(url.searchParams)).toEqual({
			status: "pending",
			filterOrganization: "did:example:org"
		});
		await expect(client.countRequests("" as never)).rejects.toMatchObject({
			name: GuardError.CLASS_NAME
		});
	});

	test("accepts and rejects a request", async () => {
		fetchMock.mockResolvedValueOnce(noContentResponse()).mockResolvedValueOnce(noContentResponse());

		await client.accept("request-1");
		await client.reject("request-1", "organizationRequest.reason.unknown");

		expect(fetchMock.mock.calls.map(([url, options]) => [url, options.method])).toEqual([
			[`${ENDPOINT}/${prefix}/request-1/accept`, HttpMethod.POST],
			[`${ENDPOINT}/${prefix}/request-1/reject`, HttpMethod.POST]
		]);
		expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
			reason: "organizationRequest.reason.unknown"
		});
		await expect(client.accept("")).rejects.toMatchObject({ name: GuardError.CLASS_NAME });
	});

	test("removes the requests of an account", async () => {
		fetchMock.mockResolvedValueOnce(noContentResponse());

		await client.removeForAccount("account-1");

		const [url, options] = fetchMock.mock.calls[0];
		expect(url).toBe(`${ENDPOINT}/${prefix}/account/account-1`);
		expect(options.method).toBe(HttpMethod.DELETE);
		await expect(client.removeForAccount("")).rejects.toMatchObject({
			name: GuardError.CLASS_NAME
		});
	});
});

describe("EntityStorageAuthenticationAccountRestClient organization", () => {
	beforeEach(() => {
		setupFetchMock(fetchMock);
	});

	afterEach(() => {
		teardownFetchMock(fetchMock);
	});

	test("gets the organization of the signed in account", async () => {
		fetchMock
			.mockResolvedValueOnce(jsonResponse({ organization: "did:example:org" }))
			.mockResolvedValueOnce(jsonResponse({}));
		const client = new EntityStorageAuthenticationAccountRestClient({ endpoint: ENDPOINT });

		await expect(client.getOrganization()).resolves.toBe("did:example:org");
		await expect(client.getOrganization()).resolves.toBeUndefined();
		expect(fetchMock.mock.calls[0][0]).toBe(`${ENDPOINT}/authentication/account/organization`);
	});

	test("gets the status of the request of the signed in account", async () => {
		fetchMock
			.mockResolvedValueOnce(jsonResponse({ request: REQUEST }))
			.mockResolvedValueOnce(jsonResponse({}));
		const client = new EntityStorageAuthenticationAccountRestClient({ endpoint: ENDPOINT });

		await expect(client.getOrganizationRequest()).resolves.toEqual(REQUEST);
		await expect(client.getOrganizationRequest()).resolves.toBeUndefined();
		expect(fetchMock.mock.calls[0][0]).toBe(
			`${ENDPOINT}/authentication/account/organization/request`
		);
	});

	test("cancels the pending request of the signed in account", async () => {
		fetchMock.mockResolvedValueOnce(noContentResponse());
		const client = new EntityStorageAuthenticationAccountRestClient({ endpoint: ENDPOINT });

		await client.cancelOrganizationRequest();

		expect(fetchMock.mock.calls[0][0]).toBe(
			`${ENDPOINT}/authentication/account/organization/request`
		);
		expect(fetchMock.mock.calls[0][1].method).toBe(HttpMethod.DELETE);
	});
});
