// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { GuardError } from "@3sixty/core";
import { HttpMethod } from "@3sixty/web";
import {
	createdResponse,
	jsonResponse,
	noContentResponse,
	setupFetchMock,
	teardownFetchMock
} from "./helpers/restClientTestHelpers.js";
import { OrganizationRestClient } from "../src/organizationRestClient.js";

const ENDPOINT = "http://localhost:8080";
const PREFIX = "authentication/organization";
const ORGANIZATION = {
	id: "org-1",
	identity: "did:example:org",
	dateCreated: "2026-01-12T09:05:23.123Z",
	dateModified: "2026-01-12T09:05:23.123Z"
};

const fetchMock = vi.fn();

describe("OrganizationRestClient", () => {
	let client: OrganizationRestClient;

	beforeEach(() => {
		setupFetchMock(fetchMock);
		client = new OrganizationRestClient({ endpoint: ENDPOINT });
	});

	afterEach(() => {
		teardownFetchMock(fetchMock);
	});

	test("creates an organization and reads it back from its location", async () => {
		fetchMock
			.mockResolvedValueOnce(createdResponse(`${ENDPOINT}/${PREFIX}/org-1`))
			.mockResolvedValueOnce(jsonResponse(ORGANIZATION));

		await expect(client.create({ identity: "did:example:org" })).resolves.toEqual(ORGANIZATION);

		expect(fetchMock.mock.calls[0][0]).toBe(`${ENDPOINT}/${PREFIX}`);
		expect(fetchMock.mock.calls[0][1].method).toBe(HttpMethod.POST);
		expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ identity: "did:example:org" });
		expect(fetchMock.mock.calls[1][0]).toBe(`${ENDPOINT}/${PREFIX}/org-1`);
	});

	test("exports the identity of an organization", async () => {
		const identity = {
			version: 1,
			namespace: "entity-storage",
			selfControlled: false,
			document: { id: "did:entity-storage:0x1" },
			keys: []
		};
		fetchMock.mockResolvedValueOnce(jsonResponse({ identity, nextRevocationIndex: 3 }));

		await expect(client.exportIdentity("org-1")).resolves.toEqual({
			identity,
			nextRevocationIndex: 3
		});

		expect(fetchMock.mock.calls[0][0]).toBe(`${ENDPOINT}/${PREFIX}/org-1/export`);
		expect(fetchMock.mock.calls[0][1].method).toBe(HttpMethod.POST);
	});

	test("gets and queries the organizations", async () => {
		fetchMock
			.mockResolvedValueOnce(jsonResponse(ORGANIZATION))
			.mockResolvedValueOnce(jsonResponse({ entities: [ORGANIZATION], cursor: "next" }));

		await expect(client.get("org-1")).resolves.toEqual(ORGANIZATION);
		await expect(client.query("c1", 5)).resolves.toEqual({
			entities: [ORGANIZATION],
			cursor: "next"
		});

		const queryUrl = new URL(fetchMock.mock.calls[1][0]);
		expect(queryUrl.searchParams.get("cursor")).toBe("c1");
		expect(queryUrl.searchParams.get("limit")).toBe("5");
	});

	test("updates and removes an organization", async () => {
		fetchMock.mockResolvedValueOnce(noContentResponse()).mockResolvedValueOnce(noContentResponse());
		const publicProfile = { "@context": "https://schema.org", "@type": "Organization" };

		await client.update("org-1", publicProfile);
		await client.remove("org-1");

		expect(fetchMock.mock.calls[0][0]).toBe(`${ENDPOINT}/${PREFIX}/org-1`);
		expect(fetchMock.mock.calls[0][1].method).toBe(HttpMethod.PUT);
		expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ publicProfile });
		expect(fetchMock.mock.calls[1][1].method).toBe(HttpMethod.DELETE);
	});

	test("guards the arguments", async () => {
		await expect(client.get("")).rejects.toMatchObject({ name: GuardError.CLASS_NAME });
		await expect(client.remove("")).rejects.toMatchObject({ name: GuardError.CLASS_NAME });
		await expect(client.create(undefined as never)).rejects.toMatchObject({
			name: GuardError.CLASS_NAME
		});
	});
});
