// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { ExportFileHelper } from "../../src/helpers/exportFileHelper.js";
import { ExportFileType } from "../../src/models/exportFileType.js";

describe("ExportFileHelper", () => {
	const file = { type: ExportFileType.AccountIdentity, version: 1, identity: { keys: ["secret"] } };

	test("accepts a file of the type and version expected", () => {
		expect(ExportFileHelper.isType(file, ExportFileType.AccountIdentity)).toBe(true);
		expect(() => ExportFileHelper.guard(file, ExportFileType.AccountIdentity)).not.toThrow();
	});

	test("refuses a file of another type, reporting a short type only", () => {
		for (const [value, actual] of [
			[undefined, undefined],
			["text", undefined],
			[[file], undefined],
			[{ version: 1 }, undefined],
			[file, "account-identity"],
			[{ ...file, type: "x".repeat(65) }, undefined]
		] as const) {
			expect(ExportFileHelper.isType(value, ExportFileType.AccountProfile)).toBe(false);
			expect(() => ExportFileHelper.guard(value, ExportFileType.AccountProfile)).toThrow(
				expect.objectContaining({
					name: "UnprocessableError",
					message: "exportFileHelper.fileTypeMismatch",
					properties: { expected: "account-profile", actual }
				})
			);
		}
	});

	test("refuses a file of another version", () => {
		for (const [version, reported] of [
			[2, 2],
			[0, 0],
			["1", undefined],
			[undefined, undefined]
		] as const) {
			const other = { ...file, version };
			expect(ExportFileHelper.isType(other, ExportFileType.AccountIdentity)).toBe(false);
			expect(() => ExportFileHelper.guard(other, ExportFileType.AccountIdentity)).toThrow(
				expect.objectContaining({
					name: "UnprocessableError",
					message: "exportFileHelper.fileVersionUnsupported",
					properties: { version: reported, supported: 1 }
				})
			);
		}
	});

	test("never puts the content of the file in the error", () => {
		expect(() =>
			ExportFileHelper.guard({ ...file, version: 9 }, ExportFileType.AccountIdentity)
		).toThrow(
			expect.not.objectContaining({
				properties: expect.objectContaining({ identity: expect.anything() })
			})
		);
	});
});
