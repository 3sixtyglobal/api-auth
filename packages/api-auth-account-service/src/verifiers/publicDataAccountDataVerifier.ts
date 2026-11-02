// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IAccountDataVerifier } from "@3sixty/api-auth-models";
import { nameof } from "@3sixty/nameof";
import { PublicDataHelper } from "../utils/publicDataHelper.js";

/**
 * Verifies a public data item, a schema.org ItemList of the paths that are public.
 */
export class PublicDataAccountDataVerifier implements IAccountDataVerifier {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<PublicDataAccountDataVerifier>();

	/**
	 * Verify the value of a public data item.
	 * @param data The value of the item.
	 * @param accountOwned True when the account sets the value itself, rather than an admin or an
	 * authentication provider.
	 * @returns A promise that resolves when the value is valid.
	 * @throws UnprocessableError when it is not a list of valid paths.
	 */
	public async verify(data: unknown, accountOwned: boolean): Promise<void> {
		PublicDataHelper.getPaths(data, true);
	}

	/**
	 * The most items of the type an account may hold.
	 * @returns Undefined, there is no limit other than the configured ones.
	 */
	public maxInstances(): number | undefined {
		return undefined;
	}
}
