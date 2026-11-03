// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { DurationConstants } from "@3sixty/core";
import { RecentSignInHelper } from "../../src/helpers/recentSignInHelper.js";

describe("RecentSignInHelper", () => {
	const now = Math.floor(Date.now() / DurationConstants.MsPerSecond);

	test("accepts a session that started within the window", () => {
		expect(() => RecentSignInHelper.guard(now, 300)).not.toThrow();
		expect(() => RecentSignInHelper.guard(now - 300, 300)).not.toThrow();
	});

	test("refuses a missing or older session start", () => {
		for (const sessionStart of [undefined, now - 301, 1.5]) {
			expect(() => RecentSignInHelper.guard(sessionStart, 300)).toThrow(
				expect.objectContaining({
					name: "UnauthorizedError",
					message: "recentSignInHelper.recentSignInRequired",
					properties: { maxAgeSeconds: 300 }
				})
			);
		}
	});

	test("accepts a session start within the allowed clock skew", () => {
		expect(() =>
			RecentSignInHelper.guard(now + RecentSignInHelper.MAX_FUTURE_SKEW_SECONDS, 300)
		).not.toThrow();
	});

	test("refuses a session start in the future or in milliseconds", () => {
		for (const sessionStart of [
			now + RecentSignInHelper.MAX_FUTURE_SKEW_SECONDS + 5,
			now + DurationConstants.SecondsPerHour,
			Date.now()
		]) {
			expect(() => RecentSignInHelper.guard(sessionStart, 300)).toThrow(
				expect.objectContaining({
					name: "UnauthorizedError",
					message: "recentSignInHelper.recentSignInRequired"
				})
			);
		}
	});
});
