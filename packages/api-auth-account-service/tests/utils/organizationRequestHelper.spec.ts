// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { OrganizationRequestStatus } from "@3sixty/api-auth-models";
import { MemoryEntityStorageConnector } from "@3sixty/entity-storage-connector-memory";
import { nameof } from "@3sixty/nameof";
import type { OrganizationRequest } from "../../src/entities/organizationRequest.js";
import { initSchema } from "../../src/schema.js";
import { OrganizationRequestHelper } from "../../src/utils/organizationRequestHelper.js";

initSchema();

/**
 * Build a request.
 * @param id The id.
 * @param accountId The account.
 * @param organization The organization.
 * @param status The status.
 * @param dateModified When it was modified.
 * @returns The request.
 */
function request(
	id: string,
	accountId: string,
	organization: string,
	status: OrganizationRequestStatus,
	dateModified: string = "2026-01-01T00:00:00.000Z"
): OrganizationRequest {
	return { id, accountId, organization, status, dateCreated: dateModified, dateModified };
}

describe("OrganizationRequestHelper", () => {
	let storage: MemoryEntityStorageConnector<OrganizationRequest>;

	beforeEach(() => {
		storage = new MemoryEntityStorageConnector<OrganizationRequest>({
			entitySchema: nameof<OrganizationRequest>(),
			config: { storageKey: "organization-request-helper" }
		});
	});

	afterEach(async () => {
		await storage.teardown();
	});

	it("should only return exact matches, reading on past pages with none", async () => {
		const own = request("own", "account-1", "did:example:org", OrganizationRequestStatus.Pending);
		const other = request(
			"other",
			"ACCOUNT-1",
			"did:example:org",
			OrganizationRequestStatus.Pending
		);
		// Storage that compares without case returns the request of another account first, with a
		// cursor to a page holding the match.
		const query = vi.spyOn(storage, "query");
		query.mockImplementation(async (conditions, sort, properties, cursor) => {
			if (cursor === "next") {
				return { entities: [own] };
			}
			return { entities: [other], cursor: "next" };
		});

		await expect(
			OrganizationRequestHelper.findPending(storage, "account-1", "did:example:org")
		).resolves.toEqual(own);
		await expect(OrganizationRequestHelper.findAllPending(storage, "account-1")).resolves.toEqual([
			own
		]);
		await expect(OrganizationRequestHelper.getLatest(storage, "account-1")).resolves.toEqual(own);
		await expect(
			OrganizationRequestHelper.findPending(storage, "account-1", "did:example:else")
		).resolves.toBeUndefined();
	});

	it("should find every pending request and the latest request of an account", async () => {
		await storage.set(
			request("a", "account-1", "did:example:a", OrganizationRequestStatus.Pending)
		);
		await storage.set(
			request("b", "account-1", "did:example:b", OrganizationRequestStatus.Pending)
		);
		await storage.set(
			request(
				"c",
				"account-1",
				"did:example:c",
				OrganizationRequestStatus.Rejected,
				"2026-02-01T00:00:00.000Z"
			)
		);
		await storage.set(
			request("d", "account-2", "did:example:a", OrganizationRequestStatus.Pending)
		);

		const pending = await OrganizationRequestHelper.findAllPending(storage, "account-1");
		expect(pending.map(item => item.id).sort()).toEqual(["a", "b"]);
		await expect(OrganizationRequestHelper.getLatest(storage, "account-1")).resolves.toMatchObject({
			id: "c"
		});
		await expect(
			OrganizationRequestHelper.getLatest(storage, "account-3")
		).resolves.toBeUndefined();
	});
});
