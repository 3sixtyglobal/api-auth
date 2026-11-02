// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { ExportFileType } from "@3sixty/api-auth-models";
import { GuardError } from "@3sixty/core";
import { HttpMethod } from "@3sixty/web";
import { EntityStorageAuthenticationAccountAdminRestClient } from "../src/entityStorageAuthenticationAccountAdminRestClient.js";
import { EntityStorageAuthenticationAccountRestClient } from "../src/entityStorageAuthenticationAccountRestClient.js";
import {
	createdResponse,
	jsonResponse,
	noContentResponse,
	setupFetchMock,
	teardownFetchMock
} from "./helpers/restClientTestHelpers.js";

const ENDPOINT = "http://localhost:8080";
const ITEM = {
	id: "item-1",
	accountId: "account-1",
	type: "identity",
	data: { "@context": "https://www.w3.org/ns/did/v1", id: "did:example:1" },
	dateCreated: "2026-01-12T09:05:23.123Z",
	dateModified: "2026-01-12T09:05:23.123Z"
};

const fetchMock = vi.fn();

describe("EntityStorageAuthenticationAccountAdminRestClient exports and imports", () => {
	beforeEach(() => {
		setupFetchMock(fetchMock);
	});

	afterEach(() => {
		teardownFetchMock(fetchMock);
	});

	test("exports and imports the identity and profile of an account", async () => {
		const prefix = "authentication/admin/account";
		const identityFile = { type: "account-identity", version: 1, identity: {} };
		const profileFile = { type: "account-profile", version: 1, items: [] };
		fetchMock
			.mockResolvedValueOnce(jsonResponse({ identity: "did:example:new" }))
			.mockResolvedValueOnce(jsonResponse(identityFile))
			.mockResolvedValueOnce(jsonResponse({ identity: "did:example:1" }))
			.mockResolvedValueOnce(jsonResponse(profileFile))
			.mockResolvedValueOnce(jsonResponse({ itemsImported: 0, itemsRemoved: 0, skippedTypes: [] }));
		const client = new EntityStorageAuthenticationAccountAdminRestClient({ endpoint: ENDPOINT });

		await expect(client.createIdentity("account 1")).resolves.toBe("did:example:new");
		await expect(client.exportIdentity("account 1")).resolves.toEqual(identityFile);
		await expect(client.importIdentity("account 1", identityFile as never)).resolves.toEqual({
			identity: "did:example:1"
		});
		await expect(client.exportProfile("account 1")).resolves.toEqual(profileFile);
		await expect(client.importProfile("account 1", profileFile as never)).resolves.toMatchObject({
			itemsImported: 0
		});

		expect(fetchMock.mock.calls.map(([url, options]) => [url, options.method])).toEqual([
			[`${ENDPOINT}/${prefix}/account%201/identity`, HttpMethod.POST],
			[`${ENDPOINT}/${prefix}/account%201/identity/export`, HttpMethod.POST],
			[`${ENDPOINT}/${prefix}/account%201/identity/import`, HttpMethod.POST],
			[`${ENDPOINT}/${prefix}/account%201/export`, HttpMethod.GET],
			[`${ENDPOINT}/${prefix}/account%201/import`, HttpMethod.POST]
		]);
		expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual(identityFile);
		await expect(client.exportIdentity("")).rejects.toMatchObject({
			name: GuardError.CLASS_NAME
		});
	});
});

describe("EntityStorageAuthenticationAccountRestClient", () => {
	const prefix = "authentication/account";
	let client: EntityStorageAuthenticationAccountRestClient;

	beforeEach(() => {
		setupFetchMock(fetchMock);
		client = new EntityStorageAuthenticationAccountRestClient({ endpoint: ENDPOINT });
	});

	afterEach(() => {
		teardownFetchMock(fetchMock);
	});

	test("creates an item and returns its id", async () => {
		fetchMock.mockResolvedValueOnce(createdResponse(`${ENDPOINT}/${prefix}/item-1`));

		const id = await client.create("identity", ITEM.data);

		const [url, options] = fetchMock.mock.calls[0];
		expect(url).toBe(`${ENDPOINT}/${prefix}`);
		expect(options.method).toBe(HttpMethod.POST);
		expect(JSON.parse(options.body)).toEqual({ type: "identity", data: ITEM.data });
		expect(id).toBe("item-1");
	});

	test("guards the type", async () => {
		await expect(client.create("", ITEM.data)).rejects.toMatchObject({
			name: GuardError.CLASS_NAME
		});
	});

	test("adopts an identity, with or without a DID and its proof", async () => {
		fetchMock
			.mockResolvedValueOnce(jsonResponse({ identity: "did:example:created" }))
			.mockResolvedValueOnce(jsonResponse({ identity: "did:example:owned" }));
		const proof = { type: "DataIntegrityProof", verificationMethod: "did:example:owned#key-1" };

		await expect(client.adoptIdentity()).resolves.toBe("did:example:created");
		await expect(client.adoptIdentity("did:example:owned", proof as never)).resolves.toBe(
			"did:example:owned"
		);

		// The body is always sent, the route refuses a request without one.
		expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({});
		const [url, options] = fetchMock.mock.calls[1];
		expect(url).toBe(`${ENDPOINT}/${prefix}/identity`);
		expect(options.method).toBe(HttpMethod.POST);
		expect(JSON.parse(options.body)).toEqual({ identity: "did:example:owned", proof });
	});

	test("exports, imports and removes the identity", async () => {
		const exported = {
			identity: {
				version: 1,
				namespace: "entity-storage",
				selfControlled: true,
				document: { id: "did:entity-storage:0x1" },
				keys: []
			},
			credentials: ["jwt"]
		};
		const result = {
			identity: "did:entity-storage:0x1",
			credentialsImported: 1,
			credentialsSkipped: 0,
			organizations: []
		};
		fetchMock
			.mockResolvedValueOnce(jsonResponse(exported))
			.mockResolvedValueOnce(jsonResponse(result))
			.mockResolvedValueOnce(noContentResponse());

		await expect(client.exportIdentity()).resolves.toEqual(exported);
		await expect(client.importIdentity(exported as never)).resolves.toEqual(result);
		await client.removeIdentity();

		expect(fetchMock.mock.calls.map(([url, options]) => [url, options.method])).toEqual([
			[`${ENDPOINT}/${prefix}/identity/export`, HttpMethod.POST],
			[`${ENDPOINT}/${prefix}/identity/import`, HttpMethod.POST],
			[`${ENDPOINT}/${prefix}/identity`, HttpMethod.DELETE]
		]);
		expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual(exported);
	});

	test("does not send a session start, the server reads it from the token", async () => {
		const exported = {
			identity: { version: 1, namespace: "entity-storage", selfControlled: true, keys: [] }
		};
		fetchMock
			.mockResolvedValueOnce(jsonResponse({ identity: "did:example:created" }))
			.mockResolvedValueOnce(jsonResponse({ identity: "did:example:created" }));

		await client.adoptIdentity(undefined, undefined, 1767225600);
		await client.importIdentity(exported as never, 1767225600);

		expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({});
		expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual(exported);
	});

	test("exports and imports the account data", async () => {
		const profile = {
			type: ExportFileType.AccountProfile,
			version: 1,
			items: [{ type: "profile", data: { name: "A" } }]
		};
		const result = { itemsImported: 1, itemsRemoved: 0, skippedTypes: [] };
		fetchMock
			.mockResolvedValueOnce(jsonResponse(profile))
			.mockResolvedValueOnce(jsonResponse(result));

		await expect(client.exportProfile()).resolves.toEqual(profile);
		await expect(client.importProfile(profile)).resolves.toEqual(result);

		expect(fetchMock.mock.calls[0][0]).toBe(`${ENDPOINT}/${prefix}/export`);
		expect(fetchMock.mock.calls[0][1].method).toBe(HttpMethod.GET);
		expect(fetchMock.mock.calls[1][0]).toBe(`${ENDPOINT}/${prefix}/import`);
		expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual(profile);
	});

	test("leaves an organization", async () => {
		fetchMock.mockResolvedValueOnce(noContentResponse());

		await client.leaveOrganization("did:example:org");

		const [url, options] = fetchMock.mock.calls[0];
		expect(decodeURIComponent(url)).toBe(`${ENDPOINT}/${prefix}/organization/did:example:org`);
		expect(options.method).toBe(HttpMethod.DELETE);
	});

	test("joins an organization", async () => {
		fetchMock.mockResolvedValueOnce(noContentResponse());

		await client.joinOrganization("did:example:org");

		const [url, options] = fetchMock.mock.calls[0];
		expect(url).toBe(`${ENDPOINT}/${prefix}/organization`);
		expect(JSON.parse(options.body)).toEqual({ organization: "did:example:org" });
		await expect(client.joinOrganization("")).rejects.toMatchObject({
			name: GuardError.CLASS_NAME
		});
	});

	test("creates an organization for the account", async () => {
		const organization = { id: "org-1", identity: "did:example:org", isAdmin: true };
		fetchMock.mockResolvedValueOnce(jsonResponse(organization));
		const details = { profile: { name: "Example Ltd" }, publicData: ["profile.name"] };

		await expect(client.createOrganization(details)).resolves.toEqual(organization);

		const [url, options] = fetchMock.mock.calls[0];
		expect(url).toBe(`${ENDPOINT}/${prefix}/organization/create`);
		expect(options.method).toBe(HttpMethod.POST);
		expect(JSON.parse(options.body)).toEqual(details);
		await expect(client.createOrganization(undefined as never)).rejects.toMatchObject({
			name: GuardError.CLASS_NAME
		});
	});

	test("gets the public data by identity and by account", async () => {
		const objects = [{ "@type": "Organization", name: "Example Ltd" }];
		fetchMock
			.mockResolvedValueOnce(jsonResponse(objects))
			.mockResolvedValueOnce(jsonResponse(objects));

		await expect(client.getPublicDataByIdentity("did:example:org")).resolves.toEqual(objects);
		await expect(client.getPublicDataByAccount("account-1")).resolves.toEqual(objects);

		expect(fetchMock.mock.calls[0][0]).toBe(
			`${ENDPOINT}/${prefix}/public/identity/did:example:org`
		);
		expect(fetchMock.mock.calls[1][0]).toBe(`${ENDPOINT}/${prefix}/public/account/account-1`);
		await expect(client.getPublicDataByIdentity("")).rejects.toMatchObject({
			name: GuardError.CLASS_NAME
		});
	});

	test("gets, updates and removes an item", async () => {
		fetchMock
			.mockResolvedValueOnce(jsonResponse(ITEM))
			.mockResolvedValueOnce(noContentResponse())
			.mockResolvedValueOnce(noContentResponse());

		await expect(client.get("item-1")).resolves.toEqual(ITEM);
		await client.update("item-1", { name: "A" });
		await client.remove("item-1");

		expect(fetchMock.mock.calls.map(([url, options]) => [url, options.method])).toEqual([
			[`${ENDPOINT}/${prefix}/item-1`, HttpMethod.GET],
			[`${ENDPOINT}/${prefix}/item-1`, HttpMethod.PUT],
			[`${ENDPOINT}/${prefix}/item-1`, HttpMethod.DELETE]
		]);
		expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ data: { name: "A" } });
	});

	test("queries by type", async () => {
		fetchMock.mockResolvedValueOnce(jsonResponse({ entities: [ITEM], cursor: "next" }));

		const result = await client.query("identity", "c1", 5);

		const [url] = fetchMock.mock.calls[0];
		expect(url).toBe(`${ENDPOINT}/${prefix}?type=identity&cursor=c1&limit=5`);
		expect(result).toEqual({ entities: [ITEM], cursor: "next" });
	});
});

describe("EntityStorageAuthenticationAccountAdminRestClient", () => {
	const prefix = "authentication/admin/account";
	let client: EntityStorageAuthenticationAccountAdminRestClient;

	beforeEach(() => {
		setupFetchMock(fetchMock);
		client = new EntityStorageAuthenticationAccountAdminRestClient({ endpoint: ENDPOINT });
	});

	afterEach(() => {
		teardownFetchMock(fetchMock);
	});

	test("creates an item for an account", async () => {
		fetchMock.mockResolvedValueOnce(createdResponse(`${ENDPOINT}/${prefix}/item-1`));

		const id = await client.create("account-1", "organization", "did:example:org");

		const [url, options] = fetchMock.mock.calls[0];
		expect(url).toBe(`${ENDPOINT}/${prefix}`);
		expect(JSON.parse(options.body)).toEqual({
			accountId: "account-1",
			type: "organization",
			data: "did:example:org"
		});
		expect(id).toBe("item-1");
	});

	test("creates an identity with the proof of ownership", async () => {
		fetchMock.mockResolvedValueOnce(createdResponse(`${ENDPOINT}/${prefix}/item-1`));
		const proof = { type: "DataIntegrityProof", verificationMethod: "did:example:1#key-1" };

		await client.create("account-1", "identity", "did:example:1", undefined, proof as never);

		expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
			accountId: "account-1",
			type: "identity",
			data: "did:example:1",
			proof
		});
	});

	test("creates and updates an item only admins may see", async () => {
		fetchMock
			.mockResolvedValueOnce(createdResponse(`${ENDPOINT}/${prefix}/item-1`))
			.mockResolvedValueOnce(noContentResponse());

		await client.create("account-1", "note", { text: "a" }, undefined, undefined, true);
		await client.update("item-1", { text: "b" }, undefined, false);

		expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
			accountId: "account-1",
			type: "note",
			data: { text: "a" },
			adminOnly: true
		});
		expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
			data: { text: "b" },
			adminOnly: false
		});
	});

	test("gets, grants and revokes the roles of an account", async () => {
		fetchMock
			.mockResolvedValueOnce(jsonResponse({ roles: ["user"] }))
			.mockResolvedValueOnce(jsonResponse({ roles: ["user", "user-admin"] }))
			.mockResolvedValueOnce(noContentResponse())
			.mockResolvedValueOnce(noContentResponse());

		await expect(client.getRoles("account-1")).resolves.toEqual(["user"]);
		await expect(client.getAssignableRoles()).resolves.toEqual(["user", "user-admin"]);
		await client.addRole("account-1", "user-admin");
		await client.removeRole("account-1", "user-admin");

		expect(fetchMock.mock.calls.map(([url, options]) => [url, options.method])).toEqual([
			[`${ENDPOINT}/${prefix}/account-1/roles`, HttpMethod.GET],
			[`${ENDPOINT}/${prefix}/roles/assignable`, HttpMethod.GET],
			[`${ENDPOINT}/${prefix}/account-1/roles/user-admin`, HttpMethod.PUT],
			[`${ENDPOINT}/${prefix}/account-1/roles/user-admin`, HttpMethod.DELETE]
		]);
		await expect(client.addRole("account-1", "")).rejects.toMatchObject({
			name: GuardError.CLASS_NAME
		});
	});

	test("gets the accounts the caller manages", async () => {
		fetchMock
			.mockResolvedValueOnce(jsonResponse({ accountIds: ["account-1"] }))
			.mockResolvedValueOnce(jsonResponse({}));

		await expect(client.getManagedAccounts()).resolves.toEqual(["account-1"]);
		await expect(client.getManagedAccounts()).resolves.toBeUndefined();
		expect(fetchMock.mock.calls[0][0]).toBe(`${ENDPOINT}/${prefix}/managed`);
	});

	test("guards the account id", async () => {
		await expect(client.create("", "organization", "did:example:org")).rejects.toMatchObject({
			name: GuardError.CLASS_NAME
		});
	});

	test("queries by account and type", async () => {
		fetchMock.mockResolvedValueOnce(jsonResponse({ entities: [ITEM] }));

		await client.query("account-1", "identity");

		const [url] = fetchMock.mock.calls[0];
		expect(url).toBe(`${ENDPOINT}/${prefix}?accountId=account-1&type=identity`);
	});
});
