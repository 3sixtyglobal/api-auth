// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { HttpStatusCode } from "@3sixty/web";

/**
 * The response to a sign up that must verify its e-mail address, the same whether or not the
 * address already has an account.
 */
export interface IRegisterAcceptedResponse {
	/**
	 * Response status code.
	 */
	statusCode: typeof HttpStatusCode.accepted;
}
