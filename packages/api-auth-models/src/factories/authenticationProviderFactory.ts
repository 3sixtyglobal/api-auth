// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { Factory } from "@3sixty/core";
import type { IAuthenticationProvider } from "../models/IAuthenticationProvider.js";

/**
 * Factory for authentication providers, keyed by the authentication provider id.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const AuthenticationProviderFactory =
	Factory.createFactory<IAuthenticationProvider>("authentication-provider");
