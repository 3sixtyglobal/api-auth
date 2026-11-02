// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { AuthenticationAccountHelper, type IAccountDataVerifier } from "@3sixty/api-auth-models";
import { UnprocessableError } from "@3sixty/core";
import { nameof } from "@3sixty/nameof";
import { AccountDataHelper } from "../utils/accountDataHelper.js";

/**
 * Verifies an avatar item, a schema.org ImageObject holding a base64 data URL. An avatar the
 * account sets is a JPEG up to the largest avatar, one marked read only is owned by an
 * authentication provider, so it may be in any of the provider content types and up to the larger
 * size, and the account may not mark its own avatar read only.
 */
export class AvatarAccountDataVerifier implements IAccountDataVerifier {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<AvatarAccountDataVerifier>();

	/**
	 * Verify the value of an avatar item.
	 * @param data The value of the item.
	 * @param accountOwned True when the account sets the value itself, rather than an admin or an
	 * authentication provider.
	 * @returns A promise that resolves when the value is valid.
	 * @throws UnprocessableError when it is not an avatar image or is too large.
	 */
	public async verify(data: unknown, accountOwned: boolean): Promise<void> {
		const readOnly = AuthenticationAccountHelper.isReadOnly(data);
		const providerOwned = !accountOwned && readOnly;
		const maxBytes = providerOwned
			? AccountDataHelper.PROVIDER_AVATAR_MAX_BYTES
			: AccountDataHelper.AVATAR_MAX_BYTES;
		const invalid = AccountDataHelper.checkImage(
			data,
			providerOwned
				? AccountDataHelper.PROVIDER_AVATAR_CONTENT_TYPES
				: [AccountDataHelper.AVATAR_CONTENT_TYPE],
			maxBytes
		);
		if (invalid === "invalid" || (accountOwned && readOnly)) {
			throw new UnprocessableError(AccountDataHelper.CLASS_NAME, "avatarInvalid");
		}
		if (invalid === "tooLarge") {
			throw new UnprocessableError(AccountDataHelper.CLASS_NAME, "avatarTooLarge", { maxBytes });
		}
	}

	/**
	 * The most avatar items an account may hold, one, so a new avatar replaces it.
	 * @returns One.
	 */
	public maxInstances(): number | undefined {
		return 1;
	}
}
