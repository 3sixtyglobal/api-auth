// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IRestRouteEntryPoint } from "@twin.org/api-models";
import {
	generateRestRoutesAuthenticationAdmin,
	tagsAuthenticationAdmin
} from "./routes/entityStorageAuthenticationAdminRoutes.js";
import {
	generateRestRoutesAuthentication,
	tagsAuthentication
} from "./routes/entityStorageAuthenticationRoutes.js";

/**
 * REST entry points for the authentication, authentication admin, and authentication audit services.
 */
export const restEntryPoints: IRestRouteEntryPoint[] = [
	{
		name: "authentication",
		defaultBaseRoute: "authentication",
		tags: tagsAuthentication,
		generateRoutes: generateRestRoutesAuthentication
	},
	{
		name: "authenticationAdmin",
		defaultBaseRoute: "authentication/admin",
		tags: tagsAuthenticationAdmin,
		generateRoutes: generateRestRoutesAuthenticationAdmin
	}
];
