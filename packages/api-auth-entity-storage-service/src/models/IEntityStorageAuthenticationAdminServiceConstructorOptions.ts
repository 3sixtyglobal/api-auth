// Copyright 2024 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IEntityStorageAuthenticationAdminServiceConfig } from "./IEntityStorageAuthenticationAdminServiceConfig.js";

/**
 * Options for the EntityStorageAuthenticationAdminService constructor.
 */
export interface IEntityStorageAuthenticationAdminServiceConstructorOptions {
	/**
	 * The entity storage for the users.
	 * @default authentication-user
	 */
	userEntityStorageType?: string;

	/**
	 * The entity storage for password reset tokens, used to remove the tokens of a removed user.
	 * @default authentication-password-reset
	 */
	passwordResetEntityStorageType?: string;

	/**
	 * The audit component.
	 * @default authentication-audit
	 */
	authenticationAuditServiceType?: string;

	/**
	 * The authorization component used to guard accounts with escalated privilege.
	 * @default authorization
	 */
	authorizationComponentType?: string;

	/**
	 * The account data admin component, used to read and remove the data of a user.
	 * @default authentication-account-admin
	 */
	authenticationAccountAdminComponentType?: string;

	/**
	 * The organization request admin component, used to remove the requests of a removed user.
	 * @default organization-request-admin
	 */
	organizationRequestAdminComponentType?: string;

	/**
	 * The configuration for the authentication.
	 */
	config?: IEntityStorageAuthenticationAdminServiceConfig;
}
