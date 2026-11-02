// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type {
	IOrganizationRequestAcceptRequest,
	IOrganizationRequestAdminComponent,
	IOrganizationRequestCountRequest,
	IOrganizationRequestCountResponse,
	IOrganizationRequestGetRequest,
	IOrganizationRequestGetResponse,
	IOrganizationRequestQueryRequest,
	IOrganizationRequestQueryResponse,
	IOrganizationRequestRejectRequest,
	IOrganizationRequestRemoveForAccountRequest
} from "@3sixty/api-auth-models";
import type {
	IConflictResponse,
	IHttpRequestContext,
	INoContentResponse,
	INotFoundResponse,
	IRestRoute,
	IRouteAuthorization,
	ITag,
	IUnauthorizedResponse
} from "@3sixty/api-models";
import { Coerce, ComponentFactory, Guards } from "@3sixty/core";
import { nameof } from "@3sixty/nameof";
import { HttpStatusCode } from "@3sixty/web";

/**
 * The source used when communicating about these routes.
 */
const ROUTES_SOURCE = "organizationRequestAdminRoutes";

/**
 * The default authorization for the routes, used to seed authorization rules.
 */
const DEFAULT_AUTHORIZATION_READER: IRouteAuthorization = {
	permission: "user-admin:read",
	role: "user-admin"
};
const DEFAULT_AUTHORIZATION_WRITER: IRouteAuthorization = {
	permission: "user-admin:write",
	role: "user-admin",
	inherits: [DEFAULT_AUTHORIZATION_READER.permission]
};

/**
 * The tag to associate with the routes.
 */
export const tagsOrganizationRequestAdmin: ITag[] = [
	{
		name: "Organization Request Admin",
		description: "Endpoints to review the requests of accounts to join an organization."
	}
];

/**
 * The example request used in the route examples.
 */
const EXAMPLE_REQUEST_ID = "01a17afc-611a-7d5b-a898-e0e20088b36e";

/**
 * The REST routes for reviewing the requests to join an organization.
 * @param baseRouteName Prefix to prepend to the paths.
 * @param componentName The name of the component to use in the routes stored in the ComponentFactory.
 * @returns The generated routes.
 */
export function generateRestRoutesOrganizationRequestAdmin(
	baseRouteName: string,
	componentName: string
): IRestRoute[] {
	const getRoute: IRestRoute<IOrganizationRequestGetRequest, IOrganizationRequestGetResponse> = {
		operationId: "organizationRequestAdminGet",
		summary: "Get a request to join an organization",
		tag: tagsOrganizationRequestAdmin[0].name,
		method: "GET",
		path: `${baseRouteName}/:id`,
		handler: async (httpRequestContext, request) =>
			organizationRequestAdminGet(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IOrganizationRequestGetRequest>(),
			examples: [
				{
					id: "organizationRequestAdminGetRequestExample",
					description: "The request to get a request to join an organization.",
					request: {
						pathParams: {
							id: EXAMPLE_REQUEST_ID
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IOrganizationRequestGetResponse>(),
				examples: [
					{
						id: "organizationRequestAdminGetResponseExample",
						description: "The request to join an organization.",
						response: {
							body: {
								id: EXAMPLE_REQUEST_ID,
								accountId: "01a17afb-e05f-7939-83f2-d4f04c4bdf2e",
								organization: "did:example:organization",
								status: "pending",
								dateCreated: "2026-01-12T09:05:23.123Z",
								dateModified: "2026-01-12T09:05:23.123Z"
							}
						}
					}
				]
			},
			{
				type: nameof<INotFoundResponse>()
			},
			{
				type: nameof<IUnauthorizedResponse>()
			}
		],
		defaultAuthorization: DEFAULT_AUTHORIZATION_READER
	};

	const queryRoute: IRestRoute<
		IOrganizationRequestQueryRequest,
		IOrganizationRequestQueryResponse
	> = {
		operationId: "organizationRequestAdminQuery",
		summary: "Query the requests to join an organization",
		tag: tagsOrganizationRequestAdmin[0].name,
		method: "GET",
		path: `${baseRouteName}`,
		handler: async (httpRequestContext, request) =>
			organizationRequestAdminQuery(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IOrganizationRequestQueryRequest>(),
			examples: [
				{
					id: "organizationRequestAdminQueryRequestExample",
					description: "The request to query the pending requests to join an organization.",
					request: {
						query: {
							status: "pending",
							filterOrganization: "did:example:organization"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IOrganizationRequestQueryResponse>()
			},
			{
				type: nameof<IUnauthorizedResponse>()
			}
		],
		defaultAuthorization: DEFAULT_AUTHORIZATION_READER
	};

	const acceptRoute: IRestRoute<IOrganizationRequestAcceptRequest, INoContentResponse> = {
		operationId: "organizationRequestAdminAccept",
		summary: "Accept a request to join an organization",
		tag: tagsOrganizationRequestAdmin[0].name,
		method: "POST",
		path: `${baseRouteName}/:id/accept`,
		handler: async (httpRequestContext, request) =>
			organizationRequestAdminAccept(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IOrganizationRequestAcceptRequest>(),
			examples: [
				{
					id: "organizationRequestAdminAcceptRequestExample",
					description: "The request to accept a request to join an organization.",
					request: {
						pathParams: {
							id: EXAMPLE_REQUEST_ID
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<INoContentResponse>()
			},
			{
				type: nameof<INotFoundResponse>()
			},
			{
				type: nameof<IConflictResponse>()
			},
			{
				type: nameof<IUnauthorizedResponse>()
			}
		],
		defaultAuthorization: DEFAULT_AUTHORIZATION_WRITER
	};

	const rejectRoute: IRestRoute<IOrganizationRequestRejectRequest, INoContentResponse> = {
		operationId: "organizationRequestAdminReject",
		summary: "Reject a request to join an organization",
		tag: tagsOrganizationRequestAdmin[0].name,
		method: "POST",
		path: `${baseRouteName}/:id/reject`,
		handler: async (httpRequestContext, request) =>
			organizationRequestAdminReject(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IOrganizationRequestRejectRequest>(),
			examples: [
				{
					id: "organizationRequestAdminRejectRequestExample",
					description: "The request to reject a request to join an organization.",
					request: {
						pathParams: {
							id: EXAMPLE_REQUEST_ID
						},
						body: {
							reason: "organizationRequest.reason.notAMember"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<INoContentResponse>()
			},
			{
				type: nameof<INotFoundResponse>()
			},
			{
				type: nameof<IConflictResponse>()
			},
			{
				type: nameof<IUnauthorizedResponse>()
			}
		],
		defaultAuthorization: DEFAULT_AUTHORIZATION_WRITER
	};

	const removeForAccountRoute: IRestRoute<
		IOrganizationRequestRemoveForAccountRequest,
		INoContentResponse
	> = {
		operationId: "organizationRequestAdminRemoveForAccount",
		summary: "Remove every request of an account to join an organization",
		tag: tagsOrganizationRequestAdmin[0].name,
		method: "DELETE",
		path: `${baseRouteName}/account/:accountId`,
		handler: async (httpRequestContext, request) =>
			organizationRequestAdminRemoveForAccount(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IOrganizationRequestRemoveForAccountRequest>(),
			examples: [
				{
					id: "organizationRequestAdminRemoveForAccountRequestExample",
					description: "The request to remove the requests of an account.",
					request: {
						pathParams: {
							accountId: "01a17afb-e05f-7939-83f2-d4f04c4bdf2e"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<INoContentResponse>()
			},
			{
				type: nameof<IUnauthorizedResponse>()
			}
		],
		defaultAuthorization: DEFAULT_AUTHORIZATION_WRITER
	};

	const countRoute: IRestRoute<
		IOrganizationRequestCountRequest,
		IOrganizationRequestCountResponse
	> = {
		operationId: "organizationRequestAdminCount",
		summary: "Count the requests to join an organization of a status, up to a cap",
		tag: tagsOrganizationRequestAdmin[0].name,
		method: "GET",
		path: `${baseRouteName}/count`,
		handler: async (httpRequestContext, request) =>
			organizationRequestAdminCount(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IOrganizationRequestCountRequest>(),
			examples: [
				{
					id: "organizationRequestAdminCountRequestExample",
					description: "The request to count the pending requests to join an organization.",
					request: {
						query: {
							status: "pending",
							filterOrganization: "did:example:organization"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IOrganizationRequestCountResponse>(),
				examples: [
					{
						id: "organizationRequestAdminCountResponseExample",
						description: "The number of pending requests, fewer than the cap.",
						response: {
							body: {
								count: 3,
								capped: false
							}
						}
					}
				]
			},
			{
				type: nameof<IUnauthorizedResponse>()
			}
		],
		defaultAuthorization: DEFAULT_AUTHORIZATION_READER
	};

	// The count comes before the get, so count is never read as the id of a request.
	return [countRoute, getRoute, queryRoute, acceptRoute, rejectRoute, removeForAccountRoute];
}

/**
 * Count the requests to join an organization of a status, up to a cap.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function organizationRequestAdminCount(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IOrganizationRequestCountRequest
): Promise<IOrganizationRequestCountResponse> {
	Guards.object<IOrganizationRequestCountRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IOrganizationRequestCountRequest["query"]>(
		ROUTES_SOURCE,
		nameof(request.query),
		request.query
	);

	const component = ComponentFactory.get<IOrganizationRequestAdminComponent>(componentName);
	return {
		body: await component.countRequests(request.query.status, request.query.filterOrganization)
	};
}

/**
 * Remove every request of an account to join an organization.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function organizationRequestAdminRemoveForAccount(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IOrganizationRequestRemoveForAccountRequest
): Promise<INoContentResponse> {
	Guards.object<IOrganizationRequestRemoveForAccountRequest>(
		ROUTES_SOURCE,
		nameof(request),
		request
	);
	Guards.object<IOrganizationRequestRemoveForAccountRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);

	const component = ComponentFactory.get<IOrganizationRequestAdminComponent>(componentName);
	await component.removeForAccount(request.pathParams.accountId);

	return {
		statusCode: HttpStatusCode.noContent
	};
}

/**
 * Get a request to join an organization.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function organizationRequestAdminGet(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IOrganizationRequestGetRequest
): Promise<IOrganizationRequestGetResponse> {
	Guards.object<IOrganizationRequestGetRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IOrganizationRequestGetRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);

	const component = ComponentFactory.get<IOrganizationRequestAdminComponent>(componentName);
	return {
		body: await component.get(request.pathParams.id)
	};
}

/**
 * Query the requests to join an organization.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function organizationRequestAdminQuery(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IOrganizationRequestQueryRequest
): Promise<IOrganizationRequestQueryResponse> {
	Guards.object<IOrganizationRequestQueryRequest>(ROUTES_SOURCE, nameof(request), request);

	const component = ComponentFactory.get<IOrganizationRequestAdminComponent>(componentName);
	return {
		body: await component.query(
			request.query?.status,
			request.query?.filterOrganization,
			request.query?.cursor,
			Coerce.integer(request.query?.limit)
		)
	};
}

/**
 * Accept a request to join an organization.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function organizationRequestAdminAccept(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IOrganizationRequestAcceptRequest
): Promise<INoContentResponse> {
	Guards.object<IOrganizationRequestAcceptRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IOrganizationRequestAcceptRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);

	const component = ComponentFactory.get<IOrganizationRequestAdminComponent>(componentName);
	await component.accept(request.pathParams.id);

	return {
		statusCode: HttpStatusCode.noContent
	};
}

/**
 * Reject a request to join an organization.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function organizationRequestAdminReject(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IOrganizationRequestRejectRequest
): Promise<INoContentResponse> {
	Guards.object<IOrganizationRequestRejectRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IOrganizationRequestRejectRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);

	const component = ComponentFactory.get<IOrganizationRequestAdminComponent>(componentName);
	await component.reject(request.pathParams.id, request.body?.reason);

	return {
		statusCode: HttpStatusCode.noContent
	};
}
