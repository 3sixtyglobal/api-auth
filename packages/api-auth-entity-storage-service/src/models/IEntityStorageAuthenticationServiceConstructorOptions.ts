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
	 * The entity storage for password reset tokens.
	 * @default authentication-password-reset
	 */
	passwordResetEntityStorageType?: string;

	/**
	 * The vault for the private keys.
	 * @default vault
	 */
	vaultConnectorType?: string;

	/**
	 * The audit service.
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
	 * The account data admin component, used to store the profile a provider holds when it exists.
	 * @default authentication-account-admin
	 */
	authenticationAccountAdminComponentType?: string;

	/**
	 * The account data component, used to remove the identity of a removed account and the keys the
	 * node holds for it when it exists.
	 * @default authentication-account
	 */
	authenticationAccountComponentType?: string;

	/**
	 * The authorization component, used to give new accounts the default roles and remove the roles
	 * of a removed account when it exists.
	 * @default authorization
	 */
	authorizationComponentType?: string;

	/**
	 * The organization request admin component, used to remove the requests of a removed account when it exists.
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
	 * The task scheduler, used when it exists to send e-mails after the response so the response time
	 * does not reveal whether an account exists, and to remove expired sign ups and tokens.
	 * @default task-scheduler
	 */
	taskSchedulerComponentType?: string;

	/**
	 * The platform component, used when it exists to remove expired sign ups and tokens in every
	 * tenant.
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
