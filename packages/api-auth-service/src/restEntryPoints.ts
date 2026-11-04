// Copyright 2024 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IRestRouteEntryPoint } from "@3sixty/api-models";
import {
	generateRestRoutesAuthenticationAudit,
	tagsAuthenticationAudit
} from "./routes/entityStorageAuthenticationAuditRoutes.js";
import { generateRestRoutesFeature, tagsFeature } from "./routes/featureRoutes.js";

/**
 * REST entry points for the authentication audit and feature services.
 */
export const restEntryPoints: IRestRouteEntryPoint[] = [
	{
		name: "authenticationAudit",
		defaultBaseRoute: "authentication/audit",
		tags: tagsAuthenticationAudit,
		generateRoutes: generateRestRoutesAuthenticationAudit
	},
	{
		name: "feature",
		defaultBaseRoute: "features",
		tags: tagsFeature,
		generateRoutes: generateRestRoutesFeature
	}
];
