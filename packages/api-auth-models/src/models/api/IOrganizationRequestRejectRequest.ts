// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Reject a request to join an organization.
 */
export interface IOrganizationRequestRejectRequest {
	/**
	 * The path parameters for the request.
	 */
	pathParams: {
		/**
		 * The unique identifier of the request.
		 */
		id: string;
	};

	/**
	 * The rejection.
	 */
	body?: {
		/**
		 * The i18n key of the reason to give the account, for the client to translate.
		 */
		reason?: string;
	};
}
