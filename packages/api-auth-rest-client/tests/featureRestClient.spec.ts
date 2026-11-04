// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { HttpMethod } from "@3sixty/web";
import { FeatureRestClient } from "../src/featureRestClient.js";
import {
	jsonResponse,
	setupFetchMock,
	teardownFetchMock
} from "./helpers/restClientTestHelpers.js";

const ENDPOINT = "http://localhost:8080";

const fetchMock = vi.fn();

describe("FeatureRestClient", () => {
	let client: FeatureRestClient;

	beforeEach(() => {
		setupFetchMock(fetchMock);
		client = new FeatureRestClient({ endpoint: ENDPOINT });
	});

	afterEach(() => {
		teardownFetchMock(fetchMock);
	});

	test("can construct", () => {
		expect(client.className()).toEqual("FeatureRestClient");
	});

	test("sends GET to the features path and returns the features", async () => {
		const features = [{ name: "supply-chain", config: {} }];
		fetchMock.mockResolvedValueOnce(jsonResponse({ features }));

		const result = await client.list();

		const [url, options] = fetchMock.mock.calls[0];
		expect(url).toBe(`${ENDPOINT}/features`);
		expect(options.method).toBe(HttpMethod.GET);
		expect(result).toEqual(features);
	});
});
