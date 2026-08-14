// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IBaseRestClientConfig } from "@twin.org/api-models";

/**
 * Options for the Entity Storage Authentication REST client constructor.
 */
export interface IEntityStorageAuthenticationRestClientConstructorOptions extends IBaseRestClientConfig {
	/**
	 * The name of the cookie to use for storing the auth token.
	 * @default access_token
	 */
	cookieName?: string;
}
