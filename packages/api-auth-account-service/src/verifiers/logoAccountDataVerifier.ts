// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IAccountDataVerifier } from "@3sixty/api-auth-models";
import { UnprocessableError } from "@3sixty/core";
import { nameof } from "@3sixty/nameof";
import { AccountDataHelper } from "../utils/accountDataHelper.js";

/**
 * Verifies a logo item, a schema.org ImageObject holding a base64 data URL of a PNG, JPEG or SVG
 * image up to the largest logo.
 */
export class LogoAccountDataVerifier implements IAccountDataVerifier {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<LogoAccountDataVerifier>();

	/**
	 * Verify the value of a logo item.
	 * @param data The value of the item.
	 * @param accountOwned True when the account sets the value itself, rather than an admin or an
	 * authentication provider.
	 * @returns A promise that resolves when the value is valid.
	 * @throws UnprocessableError when it is not a logo image or is too large.
	 */
	public async verify(data: unknown, accountOwned: boolean): Promise<void> {
		const invalid = AccountDataHelper.checkImage(
			data,
			AccountDataHelper.LOGO_CONTENT_TYPES,
			AccountDataHelper.LOGO_MAX_BYTES
		);
		if (invalid === "invalid") {
			throw new UnprocessableError(AccountDataHelper.CLASS_NAME, "logoInvalid");
		}
		if (invalid === "tooLarge") {
			throw new UnprocessableError(AccountDataHelper.CLASS_NAME, "logoTooLarge", {
				maxBytes: AccountDataHelper.LOGO_MAX_BYTES
			});
		}
	}

	/**
	 * The most items of the type an account may hold.
	 * @returns Undefined, there is no limit other than the configured ones.
	 */
	public maxInstances(): number | undefined {
		return undefined;
	}
}
