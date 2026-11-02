// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { Is, UnprocessableError } from "@3sixty/core";
import { nameof } from "@3sixty/nameof";
import type { ExportFileType } from "../models/exportFileType.js";

/**
 * Helper methods for the type and version every exported file carries, so an import is refused
 * before anything is changed when it is given the wrong kind of file.
 */
export class ExportFileHelper {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<ExportFileHelper>();

	/**
	 * The version of the exported files.
	 */
	public static readonly VERSION: number = 1;

	/**
	 * The longest type echoed back in an error, so a file of another kind is not repeated in it.
	 * @internal
	 */
	private static readonly _MAX_REPORTED_TYPE_LENGTH: number = 64;

	/**
	 * Check a file is of the type and version expected, a quick check a client can make before
	 * asking to import it, such as before replacing an identity.
	 * @param file The parsed file.
	 * @param type The type expected.
	 * @returns True when the file has the type and version expected.
	 */
	public static isType(file: unknown, type: ExportFileType): boolean {
		return (
			Is.object<{ type?: unknown; version?: unknown }>(file) &&
			file.type === type &&
			file.version === ExportFileHelper.VERSION
		);
	}

	/**
	 * Ensure a file is of the type and version expected, checked before anything else an import does.
	 * Nothing else of the file is put in the error, as it may hold keys.
	 * @param file The parsed file.
	 * @param type The type expected.
	 * @throws UnprocessableError with the key fileTypeMismatch when the file is of another type, or
	 * fileVersionUnsupported when it is of another version.
	 */
	public static guard(file: unknown, type: ExportFileType): void {
		const fileType = Is.object<{ type?: unknown }>(file) ? file.type : undefined;
		if (fileType !== type) {
			throw new UnprocessableError(ExportFileHelper.CLASS_NAME, "fileTypeMismatch", {
				expected: type,
				actual:
					Is.stringValue(fileType) && fileType.length <= ExportFileHelper._MAX_REPORTED_TYPE_LENGTH
						? fileType
						: undefined
			});
		}
		const version = (file as { version?: unknown }).version;
		if (version !== ExportFileHelper.VERSION) {
			throw new UnprocessableError(ExportFileHelper.CLASS_NAME, "fileVersionUnsupported", {
				version: Is.number(version) ? version : undefined,
				supported: ExportFileHelper.VERSION
			});
		}
	}
}
