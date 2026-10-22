// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IRestRouteEntryPoint } from "@3sixty/api-models";
import {
	generateRestRoutesAuthenticationAudit,
	tagsAuthenticationAudit
} from "./routes/entityStorageAuthenticationAuditRoutes.js";

/**
 * REST entry points for the authentication audit service.
 */
export const restEntryPoints: IRestRouteEntryPoint[] = [
	{
		name: "authenticationAudit",
		defaultBaseRoute: "authentication/audit",
		tags: tagsAuthenticationAudit,
		generateRoutes: generateRestRoutesAuthenticationAudit
	}
];
