// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type {
	IAuditCreateRequest,
	IAuditGetRequest,
	IAuditGetResponse,
	IAuditQueryRequest,
	IAuditQueryResponse,
	IAuditRemoveRequest,
	IAuditUpdateRequest,
	IAuthenticationAuditComponent
} from "@twin.org/api-auth-models";
import {
	HttpContextIdKeys,
	HttpHeaderHelper,
	HttpUrlHelper,
	type ICreatedResponse,
	type IHttpRequestContext,
	type INoContentResponse,
	type IRestRoute,
	type IRouteAuthorization,
	type ITag,
	type IUnauthorizedResponse
} from "@twin.org/api-models";
import { ContextIdStore } from "@twin.org/context";
import { Coerce, ComponentFactory, Guards } from "@twin.org/core";
import { nameof } from "@twin.org/nameof";
import { HeaderTypes, HttpStatusCode, type IHttpHeaders } from "@twin.org/web";

/**
 * The source used when communicating about these routes.
 */
const ROUTES_SOURCE = "authenticationAuditRoutes";

/**
 * The default authorization for the routes, used to seed authorization rules.
 */
const DEFAULT_AUTHORIZATION_READER: IRouteAuthorization = {
	permission: "user:read",
	role: "user-admin"
};
const DEFAULT_AUTHORIZATION_WRITER: IRouteAuthorization = {
	permission: "user:write",
	role: "user-admin",
	inherits: [DEFAULT_AUTHORIZATION_READER.permission]
};

/**
 * The tag to associate with the routes.
 */
export const tagsAuthenticationAudit: ITag[] = [
	{
		name: "Authentication Audit",
		description: "Authentication audit endpoints for the REST server."
	}
];

/**
 * The REST routes for authentication audit.
 * @param baseRouteName Prefix to prepend to the paths.
 * @param componentName The name of the component to use in the routes stored in the ComponentFactory.
 * @returns The generated routes.
 */
export function generateRestRoutesAuthenticationAudit(
	baseRouteName: string,
	componentName: string
): IRestRoute[] {
	const createRoute: IRestRoute<IAuditCreateRequest, ICreatedResponse> = {
		operationId: "authenticationAuditCreate",
		summary: "Create an authentication audit entry",
		tag: tagsAuthenticationAudit[0].name,
		method: "POST",
		path: `${baseRouteName}`,
		handler: async (httpRequestContext, request) =>
			authenticationAuditCreate(httpRequestContext, componentName, request, baseRouteName),
		requestType: {
			type: nameof<IAuditCreateRequest>(),
			examples: [
				{
					id: "authenticationAuditCreateRequestExample",
					description: "The request to create an authentication audit entry.",
					request: {
						body: {
							actorId: "user@example.com",
							event: "login-success",
							data: {
								organizationIdentity: "did:example:org1"
							}
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<ICreatedResponse>(),
				examples: [
					{
						id: "authenticationAuditCreateResponseExample",
						description: "The response for creating an authentication audit entry.",
						response: {
							statusCode: 201,
							headers: {
								[HeaderTypes.Location]: "018f0b53d5d5704fa3a06d6ed2478575"
							}
						}
					}
				]
			},
			{
				type: nameof<IUnauthorizedResponse>()
			}
		],
		defaultAuthorization: DEFAULT_AUTHORIZATION_WRITER
	};

	const getRoute: IRestRoute<IAuditGetRequest, IAuditGetResponse> = {
		operationId: "authenticationAuditGet",
		summary: "Get an authentication audit entry",
		tag: tagsAuthenticationAudit[0].name,
		method: "GET",
		path: `${baseRouteName}/:id`,
		handler: async (httpRequestContext, request) =>
			authenticationAuditGet(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAuditGetRequest>(),
			examples: [
				{
					id: "authenticationAuditGetRequestExample",
					description: "The request to get an authentication audit entry.",
					request: {
						pathParams: {
							id: "018f0b53d5d5704fa3a06d6ed2478575"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IAuditGetResponse>(),
				examples: [
					{
						id: "authenticationAuditGetResponseExample",
						description: "The response for getting an authentication audit entry.",
						response: {
							body: {
								id: "018f0b53d5d5704fa3a06d6ed2478575",
								actorId: "user@example.com",
								dateCreated: "2026-01-12T09:05:23.123Z",
								event: "login-success",
								data: {
									organizationIdentity: "did:example:org1"
								}
							}
						}
					}
				]
			},
			{
				type: nameof<IUnauthorizedResponse>()
			}
		],
		defaultAuthorization: DEFAULT_AUTHORIZATION_WRITER
	};

	const updateRoute: IRestRoute<IAuditUpdateRequest, INoContentResponse> = {
		operationId: "authenticationAuditUpdate",
		summary: "Update an authentication audit entry",
		tag: tagsAuthenticationAudit[0].name,
		method: "PUT",
		path: `${baseRouteName}/:id`,
		handler: async (httpRequestContext, request) =>
			authenticationAuditUpdate(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAuditUpdateRequest>(),
			examples: [
				{
					id: "authenticationAuditUpdateRequestExample",
					description: "The request to update an authentication audit entry.",
					request: {
						pathParams: {
							id: "018f0b53d5d5704fa3a06d6ed2478575"
						},
						body: {
							data: {
								organizationIdentity: "did:example:org1"
							}
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

	const removeRoute: IRestRoute<IAuditRemoveRequest, INoContentResponse> = {
		operationId: "authenticationAuditRemove",
		summary: "Remove an authentication audit entry",
		tag: tagsAuthenticationAudit[0].name,
		method: "DELETE",
		path: `${baseRouteName}/:id`,
		handler: async (httpRequestContext, request) =>
			authenticationAuditRemove(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAuditRemoveRequest>(),
			examples: [
				{
					id: "authenticationAuditRemoveRequestExample",
					description: "The request to remove an authentication audit entry.",
					request: {
						pathParams: {
							id: "018f0b53d5d5704fa3a06d6ed2478575"
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

	const queryRoute: IRestRoute<IAuditQueryRequest, IAuditQueryResponse> = {
		operationId: "authenticationAuditQuery",
		summary: "Query authentication audit entries",
		tag: tagsAuthenticationAudit[0].name,
		method: "GET",
		path: `${baseRouteName}`,
		handler: async (httpRequestContext, request) =>
			authenticationAuditQuery(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAuditQueryRequest>(),
			examples: [
				{
					id: "authenticationAuditQueryRequestExample",
					description: "The request to query authentication audit entries.",
					request: {
						query: {
							actorId: "user@example.com",
							event: "login-success",
							startDate: "2026-01-01T00:00:00.000Z",
							endDate: "2026-01-31T23:59:59.999Z",
							limit: "50"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IAuditQueryResponse>(),
				examples: [
					{
						id: "authenticationAuditQueryResponseExample",
						description: "The response for querying authentication audit entries.",
						response: {
							body: {
								entries: [
									{
										id: "018f0b53d5d5704fa3a06d6ed2478575",
										actorId: "user@example.com",
										dateCreated: "2026-01-12T09:05:23.123Z",
										event: "login-success",
										data: {
											organizationIdentity: "did:example:org1"
										}
									}
								],
								cursor: "next-cursor"
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

	return [createRoute, getRoute, updateRoute, removeRoute, queryRoute];
}

/**
 * Create an authentication audit entry.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @param baseRouteName The base route name to use for the location header.
 * @returns The response object with additional http response properties.
 */
export async function authenticationAuditCreate(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAuditCreateRequest,
	baseRouteName: string
): Promise<ICreatedResponse> {
	Guards.object<IAuditCreateRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAuditCreateRequest["body"]>(ROUTES_SOURCE, nameof(request.body), request.body);

	const component = ComponentFactory.get<IAuthenticationAuditComponent>(componentName);
	const id = await component.create(request.body);

	const contextIds = await ContextIdStore.getContextIds();
	const publicOrigin = contextIds?.[HttpContextIdKeys.PublicOrigin];

	const headers: IHttpHeaders = {};
	HttpHeaderHelper.buildId(
		headers,
		id,
		HttpUrlHelper.combineOriginPath(publicOrigin, `${baseRouteName}/:id`)
	);

	return {
		statusCode: HttpStatusCode.created,
		headers
	};
}

/**
 * Get an authentication audit entry.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function authenticationAuditGet(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAuditGetRequest
): Promise<IAuditGetResponse> {
	Guards.object<IAuditGetRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAuditGetRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);

	const component = ComponentFactory.get<IAuthenticationAuditComponent>(componentName);
	const entry = await component.get(request.pathParams.id);

	return {
		body: entry
	};
}

/**
 * Update an authentication audit entry.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function authenticationAuditUpdate(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAuditUpdateRequest
): Promise<INoContentResponse> {
	Guards.object<IAuditUpdateRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAuditUpdateRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);
	Guards.object<IAuditUpdateRequest["body"]>(ROUTES_SOURCE, nameof(request.body), request.body);

	const component = ComponentFactory.get<IAuthenticationAuditComponent>(componentName);
	await component.update(request.pathParams.id, request.body);

	return {
		statusCode: HttpStatusCode.noContent
	};
}

/**
 * Remove an authentication audit entry.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function authenticationAuditRemove(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAuditRemoveRequest
): Promise<INoContentResponse> {
	Guards.object<IAuditRemoveRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAuditRemoveRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);

	const component = ComponentFactory.get<IAuthenticationAuditComponent>(componentName);
	await component.remove(request.pathParams.id);

	return {
		statusCode: HttpStatusCode.noContent
	};
}

/**
 * Query authentication audit entries.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function authenticationAuditQuery(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAuditQueryRequest
): Promise<IAuditQueryResponse> {
	Guards.object<IAuditQueryRequest>(ROUTES_SOURCE, nameof(request), request);

	const component = ComponentFactory.get<IAuthenticationAuditComponent>(componentName);
	const result = await component.query(
		{
			actorId: request.query?.actorId,
			organizationId: request.query?.organizationId,
			tenantId: request.query?.tenantId,
			nodeId: request.query?.nodeId,
			event: request.query?.event,
			startDate: request.query?.startDate,
			endDate: request.query?.endDate
		},
		request.query?.cursor,
		Coerce.integer(request.query?.limit)
	);

	return {
		body: {
			entries: result.entries,
			cursor: result.cursor
		}
	};
}
