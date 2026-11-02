// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The result of importing an identity into an account.
 */
export interface IAccountIdentityImportResult {
	/**
	 * The DID of the account.
	 */
	identity: string;

	/**
	 * The number of credentials stored.
	 */
	credentialsImported: number;

	/**
	 * The number of credentials left out, as they did not verify, were revoked or were not issued
	 * to the identity.
	 */
	credentialsSkipped: number;

	/**
	 * The registered organizations the account became a member of through its credentials.
	 */
	organizations: string[];
}
