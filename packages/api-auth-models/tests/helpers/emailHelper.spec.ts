// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { EmailHelper } from "../../src/helpers/emailHelper.js";

describe("EmailHelper", () => {
	it("should trim and lower case an e-mail address", () => {
		expect(EmailHelper.normalise("  User@Example.COM ")).toBe("user@example.com");
	});

	it("should return an empty string when there is no address", () => {
		expect(EmailHelper.normalise(undefined)).toBe("");
	});
});
