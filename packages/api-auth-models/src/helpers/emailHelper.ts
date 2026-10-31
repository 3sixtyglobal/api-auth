// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { Is } from "@3sixty/core";
import { nameof } from "@3sixty/nameof";

/**
 * Helper methods for e-mail addresses.
 */
export class EmailHelper {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<EmailHelper>();

	/**
	 * Normalise an e-mail address so addresses that differ only by case or surrounding spaces match.
	 * @param email The e-mail address.
	 * @returns The trimmed, lower case address, or an empty string when there is none.
	 */
	public static normalise(email: string | undefined): string {
		return Is.string(email) ? email.trim().toLowerCase() : "";
	}
}
