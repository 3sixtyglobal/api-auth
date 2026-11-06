// Copyright 2024 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IPasswordHashOptions } from "@3sixty/api-auth-entity-storage-models";
import type { IAuthenticationRateActionConfig } from "@3sixty/api-auth-models";

/**
 * Configuration for the entity storage authentication service.
 */
export interface IEntityStorageAuthenticationServiceConfig {
	/**
	 * The name of the key to retrieve from the vault for signing JWT.
	 * @default auth-signing
	 */
	signingKeyName?: string;

	/**
	 * The default time to live for the JWT.
	 * @default 60
	 */
	defaultTtlMinutes?: number;

	/**
	 * The minimum password length for new password validation.
	 * @default 15
	 */
	minPasswordLength?: number;

	/**
	 * The maximum password length for new password validation.
	 * @default 128
	 */
	maxPasswordLength?: number;

	/**
	 * The longest a session may last from its sign in, refreshing a token does not extend it.
	 * Unlimited when not set, as before. When set, a token from an earlier version without a session
	 * start cannot be refreshed, so its owner signs in again.
	 */
	maxSessionMinutes?: number;

	/**
	 * How long ago the session may have started for removing the account, in seconds, so a caller
	 * with an older session signs in again first.
	 * @default 300
	 */
	recentSignInSeconds?: number;

	/**
	 * The Argon2id parameters used to hash new passwords.
	 */
	passwordHashOptions?: IPasswordHashOptions;

	/**
	 * Rate limit by the client address. Only enable it when the client address can be trusted, such
	 * as behind trusted proxies, as otherwise every client may share a proxy address or spoof it.
	 * When off, the limits per client address are skipped, or applied per e-mail address or token,
	 * and the limits per e-mail address still apply.
	 * @default false
	 */
	clientAddressRateLimitEnabled?: boolean;

	/**
	 * Limit logins per client address and per e-mail address with the client, so an attacker cannot
	 * lock an account out for everyone, with loginClientRateLimit and loginAccountRateLimit also
	 * applied. Otherwise logins are limited per e-mail address only, as before. The client limits
	 * need clientAddressRateLimitEnabled.
	 * @default false
	 */
	loginRateLimitPerClient?: boolean;

	/**
	 * Optional override for the login rate limit, per e-mail address, or per e-mail address and
	 * client address when loginRateLimitPerClient is set.
	 * @default { maxAttempts: 5, windowMinutes: 15 }
	 */
	loginRateLimit?: IAuthenticationRateActionConfig;

	/**
	 * Optional override for the login rate limit per client address, for any e-mail address, used
	 * when loginRateLimitPerClient is set.
	 * @default { maxAttempts: 20, windowMinutes: 15 }
	 */
	loginClientRateLimit?: IAuthenticationRateActionConfig;

	/**
	 * Optional override for the login rate limit per e-mail address from every client, used when
	 * loginRateLimitPerClient is set, which guards an account against an attack from many addresses.
	 * @default { maxAttempts: 50, windowMinutes: 60 }
	 */
	loginAccountRateLimit?: IAuthenticationRateActionConfig;

	/**
	 * Optional override for password change rate limit.
	 * @default { maxAttempts: 5, windowMinutes: 15 }
	 */
	passwordChangeRateLimit?: IAuthenticationRateActionConfig;

	/**
	 * Optional override for the token refresh rate limit, per session, or per account for a token
	 * from an earlier version without a session start. A successful refresh is counted too, so the
	 * limit must allow the refreshes a client makes in the window, a higher limit lets a stolen
	 * token be refreshed more often.
	 * @default { maxAttempts: 30, windowMinutes: 60 }
	 */
	tokenRefreshRateLimit?: IAuthenticationRateActionConfig;

	/**
	 * Optional override for the rate limit of logins through a provider, per client address when
	 * clientAddressRateLimitEnabled is set, otherwise per account the provider identifies, checked once
	 * the provider has verified it, so a provider that is slow or fails is not limited. A successful
	 * login clears the entry.
	 * @default { maxAttempts: 20, windowMinutes: 15 }
	 */
	loginProviderRateLimit?: IAuthenticationRateActionConfig;

	/**
	 * Optional override for the rate limit of sign ups, per client address when
	 * clientAddressRateLimitEnabled is set, otherwise per e-mail address, which does not stop one
	 * client signing up many addresses.
	 * @default { maxAttempts: 5, windowMinutes: 60 }
	 */
	registerRateLimit?: IAuthenticationRateActionConfig;

	/**
	 * Optional override for the rate limit of verifying a sign up, per client address when
	 * clientAddressRateLimitEnabled is set, otherwise per token, which does not stop guessing many
	 * tokens, though tokens are long random values.
	 * @default { maxAttempts: 10, windowMinutes: 15 }
	 */
	registerVerifyRateLimit?: IAuthenticationRateActionConfig;

	/**
	 * Optional override for the rate limit of asking for a password reset link, per e-mail address
	 * and per client address. The limit per e-mail address lets anyone use up the requests of an
	 * address, delaying a reset link for its owner.
	 * @default { maxAttempts: 5, windowMinutes: 60 }
	 */
	passwordForgotRateLimit?: IAuthenticationRateActionConfig;

	/**
	 * Optional override for the rate limit of resetting a password with a reset link, per client
	 * address when clientAddressRateLimitEnabled is set, otherwise per token.
	 * @default { maxAttempts: 10, windowMinutes: 15 }
	 */
	passwordResetRateLimit?: IAuthenticationRateActionConfig;

	/**
	 * The sender of the password reset and sign up e-mails.
	 */
	emailSender: string;

	/**
	 * The company name given to every e-mail template as the companyName value, empty when not set.
	 */
	emailCompanyName?: string;

	/**
	 * The address of the page that resets the password, the token is added as the token query parameter.
	 */
	passwordResetUrl: string;

	/**
	 * How long a password reset link can be used for, in minutes.
	 * @default 30
	 */
	passwordResetExpiryMinutes?: number;

	/**
	 * How long an OAuth 2.0 authorization code for a password account can be used for, in seconds.
	 * @default 60
	 */
	authorizationCodeExpirySeconds?: number;

	/**
	 * The redirect addresses, besides those on the node's public origin, an authorization code may be
	 * sent to, matched exactly, such as the callback of an app that exchanges the code at the token
	 * endpoint.
	 */
	authorizationRedirectUris?: string[];

	/**
	 * The address of the login page that takes an OAuth 2.0 authorization request, given as the
	 * authorization endpoint in the authorization server metadata, which is only served when it is set.
	 */
	authorizationEndpoint?: string;

	/**
	 * The path of the token endpoint on the node's public origin, given in the authorization server metadata.
	 * @default authentication/token
	 */
	tokenEndpointPath?: string;

	/**
	 * The template of the password reset e-mail, given the resetUrl, expires and expiryMinutes values.
	 * @default password-reset
	 */
	passwordResetEmailTemplateId?: string;

	/**
	 * The locale of the password reset and sign up e-mails when the request prefers no language.
	 * @default en
	 */
	emailLocale?: string;

	/**
	 * The address of the page that verifies a sign up, the token is added as the token query parameter.
	 */
	registrationVerificationUrl: string;

	/**
	 * How long a sign up verification link can be used for, in minutes. An unverified sign up older
	 * than this can be replaced by a new sign up.
	 * @default 1440
	 */
	registrationVerificationExpiryMinutes?: number;

	/**
	 * The template of the sign up verification e-mail, given the verifyUrl, expires and expiryMinutes values.
	 * @default registration-verify
	 */
	registrationVerificationEmailTemplateId?: string;

	/**
	 * The template of the e-mail sent when a sign up uses an address that already has an account.
	 * @default registration-exists
	 */
	registrationExistsEmailTemplateId?: string;

	/**
	 * The roles given to accounts created by a provider login or a sign up.
	 * @default ["user"]
	 */
	defaultRoles?: string[];

	/**
	 * The authorization model ID the default roles are given in.
	 * @default system
	 */
	authorizationModelId?: string;

	/**
	 * The role that grants escalated privilege, the default roles may not include it.
	 * @default global-admin
	 */
	escalatedPrivilegeRole?: string;

	/**
	 * How often expired password reset and verification tokens, and unverified sign ups whose links
	 * have all expired, are removed, in minutes.
	 * @default 60
	 */
	cleanupIntervalMinutes?: number;

	/**
	 * How often the e-mails queued after a response, such as a password reset or sign up, are
	 * delivered, in seconds.
	 * @default 60
	 */
	deliveryIntervalSeconds?: number;
}
