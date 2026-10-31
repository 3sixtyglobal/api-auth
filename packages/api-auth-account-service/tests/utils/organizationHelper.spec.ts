// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { MemoryEntityStorageConnector } from "@3sixty/entity-storage-connector-memory";
import { EntityStorageConnectorFactory } from "@3sixty/entity-storage-models";
import { nameof } from "@3sixty/nameof";
import type { Organization } from "../../src/entities/organization.js";
import { initSchema } from "../../src/schema.js";
import { OrganizationHelper } from "../../src/utils/organizationHelper.js";

initSchema();

const ORGANIZATION = "did:example:organization";

describe("OrganizationHelper", () => {
	let organizations: MemoryEntityStorageConnector<Organization>;

	beforeEach(async () => {
		organizations = new MemoryEntityStorageConnector<Organization>({
			entitySchema: nameof<Organization>(),
			config: { storageKey: "organization-helper" }
		});
		EntityStorageConnectorFactory.register("organization", () => organizations);
		await OrganizationHelper.register(organizations, ORGANIZATION, "example");
	});

	afterEach(async () => {
		EntityStorageConnectorFactory.unregister("organization");
		await organizations.teardown();
	});

	it("should allocate no index for an organization that is not registered or without storage", async () => {
		await expect(
			OrganizationHelper.allocateRevocationIndex("organization", "did:example:tenant")
		).resolves.toBeUndefined();
		await expect(
			OrganizationHelper.allocateRevocationIndex("missing", ORGANIZATION)
		).resolves.toBeUndefined();
	});

	it("should write the organization with a plain set, without conditions or a revision", async () => {
		const spy = vi.spyOn(organizations, "set");
		await expect(
			OrganizationHelper.allocateRevocationIndex("organization", ORGANIZATION)
		).resolves.toBe(0);
		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy.mock.calls[0]).toHaveLength(1);
		expect(spy.mock.calls[0][0]).not.toHaveProperty("revision");
	});

	it("should change the latest stored organization, so a change made since it was read is kept", async () => {
		const stale = (await OrganizationHelper.findByIdentity(
			organizations,
			ORGANIZATION
		)) as Organization;
		await OrganizationHelper.allocateRevocationIndex("organization", ORGANIZATION);

		await OrganizationHelper.storeSearchName(organizations, stale, { name: "Renamed" });
		await expect(
			OrganizationHelper.findByIdentity(organizations, ORGANIZATION)
		).resolves.toMatchObject({ searchName: "renamed", nextRevocationIndex: 1 });
	});
});
