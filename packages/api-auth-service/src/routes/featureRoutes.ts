// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IFeatureComponent, IFeatureListResponse } from "@3sixty/api-auth-models";
import type {
	IHttpRequestContext,
	INoContentRequest,
	IRestRoute,
	ITag,
	IUnauthorizedResponse
} from "@3sixty/api-models";
import { ComponentFactory } from "@3sixty/core";
import { nameof } from "@3sixty/nameof";

/**
 * The tag to associate with the routes.
 */
export const tagsFeature: ITag[] = [
	{
		name: "Features",
		description: "The features of the node's extensions."
	}
];

/**
 * The REST routes for the features.
 * @param baseRouteName Prefix to prepend to the paths.
 * @param componentName The name of the component to use in the routes stored in the ComponentFactory.
 * @returns The generated routes.
 */
export function generateRestRoutesFeature(
	baseRouteName: string,
	componentName: string
): IRestRoute[] {
	const listRoute: IRestRoute<INoContentRequest, IFeatureListResponse> = {
		operationId: "featureList",
		summary: "List the features the signed in account can use",
		tag: tagsFeature[0].name,
		method: "GET",
		path: `${baseRouteName}`,
		handler: async (httpRequestContext, request) =>
			featureList(httpRequestContext, componentName, request),
		responseType: [
			{
				type: nameof<IFeatureListResponse>(),
				examples: [
					{
						id: "featureListResponseExample",
						description: "The features the signed in account can use.",
						response: {
							body: {
								features: [
									{
										name: "supply-chain",
										config: {}
									}
								]
							}
						}
					}
				]
			},
			{
				type: nameof<IUnauthorizedResponse>()
			}
		]
	};

	return [listRoute];
}

/**
 * List the features the signed in account can use.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function featureList(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: INoContentRequest
): Promise<IFeatureListResponse> {
	const component = ComponentFactory.get<IFeatureComponent>(componentName);

	return {
		body: {
			features: await component.list()
		}
	};
}
