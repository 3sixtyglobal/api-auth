// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuthenticationAccountData } from "../IAuthenticationAccountData.js";

/**
 * The items of account data.
 */
export interface IAccountDataQueryResponse {
	/**
	 * The response body.
	 */
	body: {
		/**
		 * The returned items.
		 */
		entities: IAuthenticationAccountData[];

		/**
		 * The cursor to retrieve the next page, if any.
		 */
		cursor?: string;
	};
}
