// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type {
	IHttpRequestContext,
	INoContentRequest,
	INoContentResponse,
	IRestRoute,
	ITag
} from "@3sixty/api-models";
import { GeneralError, NotImplementedError } from "@3sixty/core";
import { nameof } from "@3sixty/nameof";
import type { HttpMethod } from "@3sixty/web";

/**
 * The tag to associate with the routes.
 */
export const tagsIdentityProfileDeprecated: ITag[] = [
	{
		name: "Identity Profile",
		description:
			"Deprecated, the profiles of an account are managed through the authentication account endpoints."
	}
];

/**
 * The REST routes that replace the identity profile routes, each refuses the request with a
 * deprecation notice pointing at the authentication account endpoints.
 * @param baseRouteName Prefix to prepend to the paths.
 * @param componentName The name of the component to use in the routes stored in the ComponentFactory.
 * @returns The generated routes.
 */
export function generateRestRoutesIdentityProfileDeprecated(
	baseRouteName: string,
	componentName: string
): IRestRoute[] {
	const routes: [string, HttpMethod, string, string][] = [
		["identityProfileCreate", "POST", "/", "Create an identity profile"],
		["identityProfileGet", "GET", "/", "Get the identity profile properties"],
		[
			"identityProfileAdminGet",
			"GET",
			"/:userIdentity",
			"Get the identity profile properties of another user"
		],
		[
			"identityProfileGetPublic",
			"GET",
			"/:identity/public",
			"Get the identity profile public properties"
		],
		["identityProfileUpdate", "PUT", "/", "Update an identity profile properties"],
		[
			"identityProfileAdminUpdate",
			"PUT",
			"/:userIdentity",
			"Update the identity profile properties of another user"
		],
		["identityProfileRemove", "DELETE", "/", "Remove an identity profile"],
		[
			"identityProfileAdminRemove",
			"DELETE",
			"/:userIdentity",
			"Remove the identity profile of another user"
		],
		["identitiesProfileList", "GET", "/query/", "Get the list of profile data for identities"],
		[
			"identitiesProfileAdminList",
			"GET",
			"/admin/query/",
			"Get the list of profile data for identities including private properties"
		]
	];

	return routes.map(
		([operationId, method, path, summary]): IRestRoute<INoContentRequest, INoContentResponse> => ({
			operationId,
			summary: `Deprecated: ${summary}, use the authentication account endpoints`,
			tag: tagsIdentityProfileDeprecated[0].name,
			method,
			path: `${baseRouteName}${path}`,
			handler: async httpRequestContext =>
				identityProfileDeprecated(httpRequestContext, componentName),
			requestType: {
				type: nameof<INoContentRequest>()
			},
			responseType: [
				{
					type: nameof<INoContentResponse>()
				}
			],
			// The notice is returned to every caller, the routes give access to no data.
			skipAuth: true
		})
	);
}

/**
 * Refuse a request to the deprecated identity profile routes.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @returns Never returns.
 * @throws NotImplementedError with the deprecation notice, pointing at the authentication account
 * endpoints, as its cause.
 */
export async function identityProfileDeprecated(
	httpRequestContext: IHttpRequestContext,
	componentName: string
): Promise<INoContentResponse> {
	throw new NotImplementedError(
		"identityProfileDeprecatedRoutes",
		"identityProfile",
		{ replacement: "/authentication/account" },
		new GeneralError("identityProfileDeprecatedRoutes", "identityProfileDeprecated")
	);
}
