// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { AuthenticationProviderType } from "./authenticationProviderType.js";

/**
 * What an authentication provider supports, so a client knows how to present it.
 */
export interface IAuthenticationProviderCapabilities {
	/**
	 * The protocol the provider signs accounts in with.
	 */
	type: AuthenticationProviderType;

	/**
	 * How people sign in, password for an e-mail and password form, redirect to send the browser to the provider.
	 */
	signInMethod: "password" | "redirect";

	/**
	 * How passwords are changed, api through the password endpoint, external with the provider.
	 */
	passwordChange: "api" | "external";

	/**
	 * The address where the password is changed, when it is changed with the provider.
	 */
	passwordChangeUrl?: string;

	/**
	 * True when the provider owns the profile, so it can only be edited with the provider.
	 */
	profileReadOnly: boolean;

	/**
	 * The address where the profile can be edited, when the provider owns it.
	 */
	profileEditUrl?: string;
}
