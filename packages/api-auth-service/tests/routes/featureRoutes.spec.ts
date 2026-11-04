// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IFeatureComponent } from "@3sixty/api-auth-models";
import { ComponentFactory } from "@3sixty/core";
import {
	featureList,
	generateRestRoutesFeature,
	tagsFeature
} from "../../src/routes/featureRoutes.js";

describe("featureRoutes", () => {
	let mockFeatureComponent: IFeatureComponent;

	beforeEach(() => {
		vi.restoreAllMocks();

		mockFeatureComponent = {
			className: vi.fn().mockReturnValue("FeatureService"),
			list: vi.fn()
		};

		vi.spyOn(ComponentFactory, "get").mockReturnValue(mockFeatureComponent);
	});

	it("should list the features", async () => {
		vi.mocked(mockFeatureComponent.list).mockResolvedValue([{ name: "supply-chain" }]);

		const result = await featureList({} as never, "feature", {});

		expect(ComponentFactory.get).toHaveBeenCalledWith("feature");
		expect(result).toEqual({
			body: { features: [{ name: "supply-chain" }] }
		});
	});

	it("should generate an authenticated list route", () => {
		const routes = generateRestRoutesFeature("features", "feature");

		expect(routes).toHaveLength(1);
		expect(routes[0].operationId).toEqual("featureList");
		expect(routes[0].method).toEqual("GET");
		expect(routes[0].path).toEqual("features");
		expect(routes[0].tag).toEqual(tagsFeature[0].name);
		expect(routes[0].skipAuth).toBeUndefined();
	});
});
