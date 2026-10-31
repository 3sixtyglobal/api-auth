// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { ILoginResult } from "@3sixty/api-auth-entity-storage-models";
import type { IComponent } from "@3sixty/core";
import type { IOAuthCallback } from "./IOAuthCallback.js";

/**
 * Contract for the component that runs the OAuth sign in flow.
 */
export interface IOAuthComponent extends IComponent {
	/**
	 * Start a sign in with a provider.
	 * @param authProviderId The authentication provider id.
	 * @param callbackUrl The address the provider sends the browser back to.
	 * @returns The address to send the browser to, and the transaction to keep until the callback.
	 */
	beginSignIn(
		authProviderId: string,
		callbackUrl: string
	): Promise<{
		location: string;
		transaction: string;
	}>;

	/**
	 * Complete a sign in when the provider sends the browser back.
	 * @param authProviderId The authentication provider id.
	 * @param callbackUrl The address the provider sent the browser back to.
	 * @param callback The query parameters from the provider.
	 * @param transaction The transaction kept since the sign in started.
	 * @returns The address to send the browser to, and the login with its profile when the sign in succeeded.
	 */
	completeSignIn(
		authProviderId: string,
		callbackUrl: string,
		callback: IOAuthCallback,
		transaction?: string
	): Promise<{
		location: string;
		login?: ILoginResult;
	}>;
}
