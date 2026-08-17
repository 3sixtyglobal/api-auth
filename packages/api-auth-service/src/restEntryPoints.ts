// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IRestRouteEntryPoint } from "@twin.org/api-models";
import {
	generateRestRoutesAuthenticationAudit,
	tagsAuthenticationAudit
} from "./routes/entityStorageAuthenticationAuditRoutes.js";

/**
 * REST entry points for the authentication, authentication admin, and authentication audit services.
 */
export const restEntryPoints: IRestRouteEntryPoint[] = [
	{
		name: "authenticationAudit",
		defaultBaseRoute: "authentication/audit",
		tags: tagsAuthenticationAudit,
		generateRoutes: generateRestRoutesAuthenticationAudit
	}
];
