// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Verify the e-mail address of a self sign up.
 */
export interface IRegisterVerifyRequest {
	/**
	 * The body of the request.
	 */
	body: {
		/**
		 * The token from the verification link.
		 */
		token: string;
	};
}
