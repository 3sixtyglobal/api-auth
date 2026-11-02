// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { MimeTypes } from "@3sixty/web";
import { PublicDataHelper } from "../../src/utils/publicDataHelper.js";

const PROFILE = {
	"@context": "https://schema.org",
	"@type": "Organization",
	name: "Example Ltd",
	email: "office@example.com",
	address: {
		"@type": "PostalAddress",
		streetAddress: "1 High Street",
		addressLocality: "London",
		geo: { "@type": "GeoCoordinates", latitude: 51.5 }
	},
	readonlyValue: true
};

describe("PublicDataHelper", () => {
	test("validates the paths", () => {
		expect(PublicDataHelper.validatePaths(["logo", "profile.address.addressLocality"])).toEqual([
			"logo",
			"profile.address.addressLocality"
		]);
		for (const paths of [
			"logo",
			[""],
			["Profile"],
			["profile."],
			["profile.a b"],
			["profile.constructor"],
			[`profile.${"a".repeat(255)}`],
			Array.from({ length: 101 }, () => "logo")
		]) {
			expect(() => PublicDataHelper.validatePaths(paths)).toThrow(
				"publicDataHelper.publicDataInvalid"
			);
		}
	});

	test("reads the paths of a public data item, none when it is not valid", () => {
		const data = PublicDataHelper.createData(["logo"]);
		expect(data).toEqual({
			"@context": "https://schema.org",
			"@type": "ItemList",
			itemListElement: ["logo"]
		});
		expect(PublicDataHelper.getPaths(data)).toEqual(["logo"]);
		expect(PublicDataHelper.getPaths({ "@type": "Thing", itemListElement: ["logo"] })).toEqual([]);
		expect(() => PublicDataHelper.getPaths(undefined, true)).toThrow();
	});

	test("builds an object per type with the context, type and selected properties", () => {
		const logo = { "@type": "ImageObject", contentUrl: `data:${MimeTypes.Png};base64,AA==` };
		const objects = PublicDataHelper.build(
			{ profile: PROFILE, logo, other: "not an object" },
			[
				"profile.name",
				"profile.address.addressLocality",
				"profile.address.geo.latitude",
				"profile.address.missing",
				"profile.nothing.here",
				"logo",
				"other",
				"absent.value"
			],
			"did:example:org"
		);

		expect(objects).toEqual([
			{
				"@context": "https://schema.org",
				"@type": "Organization",
				name: "Example Ltd",
				address: {
					"@type": "PostalAddress",
					addressLocality: "London",
					geo: { "@type": "GeoCoordinates", latitude: 51.5 }
				},
				identifier: "did:example:org"
			},
			{ ...logo, identifier: "did:example:org" }
		]);
	});

	test("returns the whole value without the read only marker, keeping an identifier", () => {
		const [whole] = PublicDataHelper.build(
			{ profile: { ...PROFILE, identifier: "kept" } },
			["profile", "profile.name"],
			"did:example:org"
		);
		const { readonlyValue, ...expected } = PROFILE;
		expect(readonlyValue).toBe(true);
		expect(whole).toEqual({ ...expected, identifier: "kept" });
	});
});
