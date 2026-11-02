// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { AuthenticationAccountHelper, type IAccountDataVerifier } from "@3sixty/api-auth-models";
import { UnprocessableError } from "@3sixty/core";
import { nameof } from "@3sixty/nameof";
import { AccountDataHelper } from "../utils/accountDataHelper.js";

/**
 * Verifies an identity item, a JSON-LD node with the DID context and the DID as its id.
 */
export class IdentityAccountDataVerifier implements IAccountDataVerifier {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<IdentityAccountDataVerifier>();

	/**
	 * Verify the value of an identity item.
	 * @param data The value of the item.
	 * @param accountOwned True when the account sets the value itself, rather than an admin or an
	 * authentication provider.
	 * @returns A promise that resolves when the value is valid.
	 * @throws UnprocessableError when it does not name a DID.
	 */
	public async verify(data: unknown, accountOwned: boolean): Promise<void> {
		if (!AccountDataHelper.isDid(AuthenticationAccountHelper.getIdentity(data))) {
			throw new UnprocessableError(AccountDataHelper.CLASS_NAME, "identityDataInvalid");
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
