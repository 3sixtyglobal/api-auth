// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuthenticationRateActionConfig } from "@3sixty/api-auth-models";

/**
 * Configuration for the EntityStorageAuthenticationAccountService.
 */
export interface IEntityStorageAuthenticationAccountServiceConfig {
	/**
	 * The rate limit for adopting an identity, per account.
	 * @default { maxAttempts: 5, windowMinutes: 15 }
	 */
	adoptIdentityRateLimit?: IAuthenticationRateActionConfig;

	/**
	 * The rate limit for exporting the identity, per account.
	 * @default { maxAttempts: 5, windowMinutes: 15 }
	 */
	exportIdentityRateLimit?: IAuthenticationRateActionConfig;

	/**
	 * The rate limit for importing an identity, per account.
	 * @default { maxAttempts: 5, windowMinutes: 15 }
	 */
	importIdentityRateLimit?: IAuthenticationRateActionConfig;

	/**
	 * The rate limit for exporting the account data, per account.
	 * @default { maxAttempts: 10, windowMinutes: 15 }
	 */
	exportProfileRateLimit?: IAuthenticationRateActionConfig;

	/**
	 * The rate limit for importing account data, per account.
	 * @default { maxAttempts: 10, windowMinutes: 15 }
	 */
	importProfileRateLimit?: IAuthenticationRateActionConfig;

	/**
	 * How long ago the session may have started for adopting, exporting, importing or removing the
	 * identity, in seconds.
	 * @default 300
	 */
	recentSignInSeconds?: number;

	/**
	 * The most items an account may store itself, the items the node stores, such as the identity,
	 * organizations and imported credentials, count towards it but are not refused.
	 * @default 1000
	 */
	maxItems?: number;

	/**
	 * The most items of a type an account may store itself, by type, merged with the defaults.
	 * @default { vc: 200 }
	 */
	maxItemsByType?: { [type: string]: number };

	/**
	 * The most items an account data import may hold.
	 * @default 1000
	 */
	profileImportMaxItems?: number;

	/**
	 * The largest size of the items of an account data import as JSON, in bytes.
	 * @default 1048576
	 */
	profileImportMaxBytes?: number;

	/**
	 * The most credentials an identity import may hold.
	 * @default 100
	 */
	identityImportMaxCredentials?: number;

	/**
	 * How long an identity proof may be used for after it was created, in seconds.
	 * @default 300
	 */
	identityProofMaxAgeSeconds?: number;

	/**
	 * The verification method of the organization that signs the membership credential, issued for
	 * the organizations an account was added to before it had an identity.
	 * @default trust-assertion
	 */
	verificationMethodId?: string;

	/**
	 * The authorization model ID the org admin roles are held in.
	 * @default system
	 */
	authorizationModelId?: string;

	/**
	 * The prefix of the org admin role of an organization, followed by its DID.
	 * @default org-admin:
	 */
	organizationAdminRolePrefix?: string;
}
