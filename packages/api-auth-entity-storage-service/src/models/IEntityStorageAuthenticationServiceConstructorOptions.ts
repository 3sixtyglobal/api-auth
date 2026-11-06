// Copyright 2024 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IEntityStorageAuthenticationServiceConfig } from "./IEntityStorageAuthenticationServiceConfig.js";

/**
 * Options for the EntityStorageAuthenticationService constructor.
 */
export interface IEntityStorageAuthenticationServiceConstructorOptions {
	/**
	 * The entity storage for the users.
	 * @default authentication-user
	 */
	userEntityStorageType?: string;

	/**
	 * The entity storage for password reset and sign up verification tokens, which must be registered.
	 * @default authentication-password-reset
	 */
	passwordResetEntityStorageType?: string;

	/**
	 * The entity storage for the OAuth 2.0 authorization codes of password accounts, which must be registered.
	 * @default authentication-authorization-code
	 */
	authorizationCodeEntityStorageType?: string;

	/**
	 * The vault for the private keys.
	 * @default vault
	 */
	vaultConnectorType?: string;

	/**
	 * The audit service, which must be registered.
	 * @default authentication-audit
	 */
	authenticationAuditServiceType?: string;

	/**
	 * The rate service.
	 * @default authentication-rate
	 */
	authenticationRateServiceType?: string;

	/**
	 * The component to retrieve tenant information.
	 * @default tenant-admin
	 */
	tenantAdminComponentType?: string;

	/**
	 * The account data admin component, used to store the profile a provider holds. It must be
	 * registered by the time the service starts.
	 * @default authentication-account-admin
	 */
	authenticationAccountAdminComponentType?: string;

	/**
	 * The account data component, used to remove the identity of a removed account and the keys the
	 * node holds for it. It must be registered by the time the service starts.
	 * @default authentication-account
	 */
	authenticationAccountComponentType?: string;

	/**
	 * The authorization component, which must be registered. It gives new accounts the default roles,
	 * returns the roles of an account when it signs in and removes the roles of a removed account.
	 * @default authorization
	 */
	authorizationComponentType?: string;

	/**
	 * The organization request admin component, used to remove the requests of a removed account. It
	 * must be registered by the time the service starts.
	 * @default organization-request-admin
	 */
	organizationRequestAdminComponentType?: string;

	/**
	 * The messaging component that sends the password reset and sign up e-mails, required when either
	 * is enabled.
	 * @default messaging
	 */
	messagingComponentType?: string;

	/**
	 * The task scheduler, used to send e-mails after the response so the response time does not
	 * reveal whether an account exists, and to remove expired sign ups and tokens.
	 * @default task-scheduler
	 */
	taskSchedulerComponentType?: string;

	/**
	 * The platform component, used to remove expired sign ups and tokens in every tenant.
	 * @default platform
	 */
	platformComponentType?: string;

	/**
	 * The logging component.
	 * @default logging
	 */
	loggingComponentType?: string;

	/**
	 * The configuration for the authentication.
	 */
	config?: IEntityStorageAuthenticationServiceConfig;
}
