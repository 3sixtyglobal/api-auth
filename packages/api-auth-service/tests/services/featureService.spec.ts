// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { FeatureFactory, type IFeatureDefinition } from "@3sixty/api-auth-models";
import type { IAuthorizationComponent } from "@3sixty/authorization-models";
import { ContextIdKeys, ContextIdStore } from "@3sixty/context";
import { ComponentFactory } from "@3sixty/core";
import { FeatureService } from "../../src/services/featureService.js";

const FEATURES: IFeatureDefinition[] = [
	{ name: "supply-chain", roles: ["user"], config: { title: "Supply chain" } },
	{ name: "reports", roles: ["global-admin"] },
	{ name: "audit", roles: ["user-admin", "global-admin"] }
];

/**
 * The feature objects each account may execute, as the authorization component would resolve them.
 */
const ALLOWED: { [subject: string]: string[] } = {
	"account-user": ["feature:supply-chain"],
	"account-user-admin": ["feature:supply-chain", "feature:audit"],
	"account-admin": ["feature:supply-chain", "feature:reports", "feature:audit"]
};

describe("FeatureService", () => {
	let check: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		check = vi.fn(
			async (modelId: string, subject: string, object: string, action: string) =>
				action === "execute" && (ALLOWED[subject] ?? []).includes(object)
		);
		ComponentFactory.register(
			"authorization",
			() => ({ check }) as unknown as IAuthorizationComponent
		);
	});

	afterEach(() => {
		ComponentFactory.unregister("authorization");
		for (const name of FeatureFactory.names()) {
			FeatureFactory.unregister(name);
		}
	});

	/**
	 * Register the test features with the feature factory, as an extension or component would.
	 */
	function registerFeatures(): void {
		for (const feature of FEATURES) {
			FeatureFactory.register(feature.name, () => feature);
		}
	}

	/**
	 * List the features as an account.
	 * @param service The service.
	 * @param accountId The account, or undefined for none.
	 * @returns The names of the features listed.
	 */
	async function listAs(service: FeatureService, accountId: string | undefined): Promise<string[]> {
		const features = await ContextIdStore.run({ [ContextIdKeys.Account]: accountId }, async () =>
			service.list()
		);
		return features.map(feature => feature.name);
	}

	test("can construct", () => {
		const service = new FeatureService();
		expect(service.className()).toEqual("FeatureService");
	});

	test("lists nothing without features", async () => {
		const service = new FeatureService();
		expect(await listAs(service, "account-user")).toEqual([]);
		expect(check).not.toHaveBeenCalled();
	});

	test("lists nothing without an account", async () => {
		registerFeatures();
		const service = new FeatureService();
		expect(await listAs(service, undefined)).toEqual([]);
		expect(check).not.toHaveBeenCalled();
	});

	test("lists nothing for an account the checks refuse", async () => {
		registerFeatures();
		const service = new FeatureService();
		expect(await listAs(service, "account-none")).toEqual([]);
	});

	test("lists the features the checks allow, without their roles", async () => {
		registerFeatures();
		const service = new FeatureService();
		const features = await ContextIdStore.run(
			{ [ContextIdKeys.Account]: "account-user" },
			async () => service.list()
		);
		expect(features).toEqual([{ name: "supply-chain", config: { title: "Supply chain" } }]);
		expect(features[0]).not.toHaveProperty("roles");
		expect(await listAs(service, "account-user-admin")).toEqual(["supply-chain", "audit"]);
		expect(await listAs(service, "account-admin")).toEqual(["supply-chain", "reports", "audit"]);
	});

	test("lists features registered after the service was created", async () => {
		const service = new FeatureService();
		expect(await listAs(service, "account-admin")).toEqual([]);
		registerFeatures();
		expect(await listAs(service, "account-admin")).toEqual(["supply-chain", "reports", "audit"]);
		FeatureFactory.unregister("reports");
		expect(await listAs(service, "account-admin")).toEqual(["supply-chain", "audit"]);
	});

	test("checks each feature in the configured authorization model", async () => {
		registerFeatures();
		const service = new FeatureService({
			config: { authorizationModelId: "tenant-model" }
		});
		await listAs(service, "account-user");
		expect(check.mock.calls).toEqual([
			["tenant-model", "account-user", "feature:supply-chain", "execute"],
			["tenant-model", "account-user", "feature:reports", "execute"],
			["tenant-model", "account-user", "feature:audit", "execute"]
		]);
	});
});
