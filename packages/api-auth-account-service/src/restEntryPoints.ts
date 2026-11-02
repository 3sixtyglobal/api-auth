// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IRestRouteEntryPoint } from "@3sixty/api-models";
import {
	generateRestRoutesAuthenticationAccountAdmin,
	tagsAuthenticationAccountAdmin
} from "./routes/entityStorageAuthenticationAccountAdminRoutes.js";
import {
	generateRestRoutesAuthenticationAccount,
	tagsAuthenticationAccount
} from "./routes/entityStorageAuthenticationAccountRoutes.js";
import {
	generateRestRoutesOrganizationRequestAdmin,
	tagsOrganizationRequestAdmin
} from "./routes/entityStorageOrganizationRequestAdminRoutes.js";
import {
	generateRestRoutesOrganization,
	tagsOrganization
} from "./routes/entityStorageOrganizationRoutes.js";

/**
 * REST entry points for the account data, account data admin, organization request admin and
 * organization services.
 */
export const restEntryPoints: IRestRouteEntryPoint[] = [
	{
		name: "authenticationAccount",
		defaultBaseRoute: "authentication/account",
		tags: tagsAuthenticationAccount,
		generateRoutes: generateRestRoutesAuthenticationAccount
	},
	{
		name: "authenticationAccountAdmin",
		defaultBaseRoute: "authentication/admin/account",
		tags: tagsAuthenticationAccountAdmin,
		generateRoutes: generateRestRoutesAuthenticationAccountAdmin
	},
	{
		name: "organizationRequestAdmin",
		defaultBaseRoute: "authentication/admin/organization-request",
		tags: tagsOrganizationRequestAdmin,
		generateRoutes: generateRestRoutesOrganizationRequestAdmin
	},
	{
		name: "organization",
		defaultBaseRoute: "authentication/organization",
		tags: tagsOrganization,
		generateRoutes: generateRestRoutesOrganization
	}
];
