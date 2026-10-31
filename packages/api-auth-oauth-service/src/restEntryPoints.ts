// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IRestRouteEntryPoint } from "@3sixty/api-models";
import { generateRestRoutesOAuth, tagsOAuth } from "./routes/oauthRoutes.js";

/**
 * REST entry points for the OAuth sign in service.
 */
export const restEntryPoints: IRestRouteEntryPoint[] = [
	{
		name: "oauth",
		defaultBaseRoute: "authentication/oauth",
		tags: tagsOAuth,
		generateRoutes: generateRestRoutesOAuth
	}
];
