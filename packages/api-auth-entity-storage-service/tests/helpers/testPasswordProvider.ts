// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { AuthenticationProviderFactory, AuthenticationProviderType } from "@3sixty/api-auth-models";
import { Is, UnauthorizedError } from "@3sixty/core";
import {
	EntityStorageConnectorFactory,
	type IEntityStorageConnector
} from "@3sixty/entity-storage-models";
import type { AuthenticationUser } from "../../src/entities/authenticationUser.js";
import { EntityStorageAuthenticationAdminService } from "../../src/services/entityStorageAuthenticationAdminService.js";
import { AccountHelper } from "../../src/utils/accountHelper.js";
import { PasswordHelper } from "../../src/utils/passwordHelper.js";

/**
 * Register a password provider that checks accounts the same way the entity storage connector does.
 */
export function registerTestPasswordProvider(): void {
	AuthenticationProviderFactory.register(
		EntityStorageAuthenticationAdminService.AUTH_PROVIDER_ID,
		() => ({
			className: () => "TestPasswordProvider",
			getCapabilities: () => ({
				type: AuthenticationProviderType.Basic,
				signInMethod: "password",
				passwordChange: "api",
				profileReadOnly: false
			}),
			authenticate: async (credentials: unknown) => {
				const { email, password } = credentials as { email: string; password: string };
				const storage =
					EntityStorageConnectorFactory.get<IEntityStorageConnector<AuthenticationUser>>(
						"authentication-user"
					);
				const user = await AccountHelper.findByEmail(
					storage,
					EntityStorageAuthenticationAdminService.AUTH_PROVIDER_ID,
					email
				);
				if (
					!Is.object<AuthenticationUser>(user) ||
					!(await PasswordHelper.verifyPassword(user, password))
				) {
					throw new UnauthorizedError("testPasswordProvider", "loginFailed");
				}
				return {
					providerAccountId: user.providerAccountId ?? user.email,
					accountId: user.accountId,
					email: user.email
				};
			}
		})
	);
}
