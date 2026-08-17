// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.

/**
 * Supported authentication audit events.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const AuthAuditEvent = {
	/**
	 * Login success.
	 */
	LoginSuccess: "login-success",

	/**
	 * Login failure.
	 */
	LoginFailure: "login-failure",

	/**
	 * Logout.
	 */
	Logout: "logout",

	/**
	 * Token refreshed.
	 */
	TokenRefreshed: "token-refreshed",

	/**
	 * Account created.
	 */
	AccountCreated: "account-created",

	/**
	 * Account deleted.
	 */
	AccountDeleted: "account-deleted",

	/**
	 * Account updated.
	 */
	AccountUpdated: "account-updated",

	/**
	 * Account locked.
	 */
	AccountLocked: "account-locked",

	/**
	 * Account unlocked.
	 */
	AccountUnlocked: "account-unlocked",

	/**
	 * Password changed.
	 */
	PasswordChanged: "password-changed"
} as const;

/**
 * Supported authentication audit event values.
 */
export type AuthAuditEvent = (typeof AuthAuditEvent)[keyof typeof AuthAuditEvent];
