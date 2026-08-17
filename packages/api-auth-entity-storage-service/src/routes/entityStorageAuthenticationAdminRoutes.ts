// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type {
	IAdminUserCreateRequest,
	IAdminUserGetByIdentityRequest,
	IAdminUserGetRequest,
	IAdminUserGetResponse,
	IAdminUserRemoveRequest,
	IAdminUserUpdatePasswordRequest,
	IAdminUserUpdateRequest,
	IAuthenticationAdminComponent
} from "@twin.org/api-auth-entity-storage-models";
import {
	HttpContextIdKeys,
	HttpHeaderHelper,
	HttpUrlHelper,
	type ICreatedResponse,
	type IHttpRequestContext,
	type INoContentResponse,
	type IRestRoute,
	type ITag,
	type IUnauthorizedResponse
} from "@twin.org/api-models";
import { ContextIdStore } from "@twin.org/context";
import { ComponentFactory, Guards } from "@twin.org/core";
import { nameof } from "@twin.org/nameof";
import { HttpStatusCode, type IHttpHeaders } from "@twin.org/web";

/**
 * The source used when communicating about these routes.
 */
const ROUTES_SOURCE = "authenticationAdminRoutes";

/**
 * The default authorization permissions for the routes, use to populate authorization rules.
 */
const PERMISSIONS_DEFAULT_ROUTE_READER = "user-admin:read";
const PERMISSIONS_DEFAULT_ROUTE_WRITER = {
	permission: "user-admin:write",
	inherits: [PERMISSIONS_DEFAULT_ROUTE_READER]
};

/**
 * The tag to associate with the routes.
 */
export const tagsAuthenticationAdmin: ITag[] = [
	{
		name: "Authentication Admin",
		description: "Authentication Admin endpoints for the REST server."
	}
];

/**
 * The REST routes for authentication admin.
 * @param baseRouteName Prefix to prepend to the paths.
 * @param componentName The name of the component to use in the routes stored in the ComponentFactory.
 * @returns The generated routes.
 */
export function generateRestRoutesAuthenticationAdmin(
	baseRouteName: string,
	componentName: string
): IRestRoute[] {
	const createUserRoute: IRestRoute<IAdminUserCreateRequest, ICreatedResponse> = {
		operationId: "authenticationAdminCreateUser",
		summary: "Create a new user",
		tag: tagsAuthenticationAdmin[0].name,
		method: "POST",
		path: `${baseRouteName}/users`,
		handler: async (httpRequestContext, request) =>
			authenticationAdminCreateUser(httpRequestContext, componentName, request, baseRouteName),
		requestType: {
			type: nameof<IAdminUserCreateRequest>(),
			examples: [
				{
					id: "createUserRequestExample",
					description: "The request to create a new user.",
					request: {
						body: {
							email: "user@example.com",
							password: "MyPassword123!",
							userIdentity: "did:example:123456789abcdefghi",
							organizationIdentity: "did:example:123456789abcdefghi"
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
		defaultPermissions: [PERMISSIONS_DEFAULT_ROUTE_WRITER]
	};

	const updateUserRoute: IRestRoute<IAdminUserUpdateRequest, INoContentResponse> = {
		operationId: "authenticationAdminUpdateUser",
		summary: "Update an existing user",
		tag: tagsAuthenticationAdmin[0].name,
		method: "PUT",
		path: `${baseRouteName}/users/:email`,
		handler: async (httpRequestContext, request) =>
			authenticationAdminUpdateUser(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAdminUserUpdateRequest>(),
			examples: [
				{
					id: "updateUserRequestExample",
					description: "The request to update an existing user.",
					request: {
						pathParams: {
							email: "user@example.com"
						},
						body: {
							userIdentity: "did:example:123456789abcdefghi",
							organizationIdentity: "did:example:123456789abcdefghi"
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
		defaultPermissions: [PERMISSIONS_DEFAULT_ROUTE_WRITER]
	};

	const updateUserPasswordRoute: IRestRoute<IAdminUserUpdatePasswordRequest, INoContentResponse> = {
		operationId: "authenticationAdminUpdateUserPassword",
		summary: "Update an existing user password",
		tag: tagsAuthenticationAdmin[0].name,
		method: "PUT",
		path: `${baseRouteName}/users/:email/password`,
		handler: async (httpRequestContext, request) =>
			authenticationAdminUpdateUserPassword(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAdminUserUpdatePasswordRequest>(),
			examples: [
				{
					id: "updateUserPasswordRequestExample",
					description: "The request to update an existing user password.",
					request: {
						pathParams: {
							email: "user@example.com"
						},
						body: {
							newPassword: "MyNewPassword123!"
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
		defaultPermissions: [PERMISSIONS_DEFAULT_ROUTE_WRITER]
	};

	const getUserRoute: IRestRoute<IAdminUserGetRequest, IAdminUserGetResponse> = {
		operationId: "authenticationAdminGetUser",
		summary: "Get existing user",
		tag: tagsAuthenticationAdmin[0].name,
		method: "GET",
		path: `${baseRouteName}/users/:email`,
		handler: async (httpRequestContext, request) =>
			authenticationAdminGetUser(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAdminUserGetRequest>(),
			examples: [
				{
					id: "getUserRequestExample",
					description: "The request to get an existing user.",
					request: {
						pathParams: {
							email: "user@example.com"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IAdminUserGetResponse>(),
				examples: [
					{
						id: "getUserResponseExample",
						description: "The response to get an existing user.",
						response: {
							body: {
								email: "user@example.com",
								userIdentity: "did:example:123456789abcdefghi",
								organizationIdentity: "did:example:123456789abcdefghi"
							}
						}
					}
				]
			},
			{
				type: nameof<IUnauthorizedResponse>()
			}
		],
		defaultPermissions: [PERMISSIONS_DEFAULT_ROUTE_READER]
	};

	const getByIdentityUserRoute: IRestRoute<IAdminUserGetByIdentityRequest, IAdminUserGetResponse> =
		{
			operationId: "authenticationAdminGetByIdentityUser",
			summary: "Get existing user by identity",
			tag: tagsAuthenticationAdmin[0].name,
			method: "GET",
			path: `${baseRouteName}/users/identity/:identity`,
			handler: async (httpRequestContext, request) =>
				authenticationAdminGetUserByIdentity(httpRequestContext, componentName, request),
			requestType: {
				type: nameof<IAdminUserGetByIdentityRequest>(),
				examples: [
					{
						id: "getUserByIdentityRequestExample",
						description: "The request to get an existing user by identity.",
						request: {
							pathParams: {
								identity: "did:example:123456789abcdefghi"
							}
						}
					}
				]
			},
			responseType: [
				{
					type: nameof<IAdminUserGetResponse>(),
					examples: [
						{
							id: "getUserResponseExample",
							description: "The response to get an existing user.",
							response: {
								body: {
									email: "user@example.com",
									userIdentity: "did:example:123456789abcdefghi",
									organizationIdentity: "did:example:123456789abcdefghi"
								}
							}
						}
					]
				},
				{
					type: nameof<IUnauthorizedResponse>()
				}
			],
			defaultPermissions: [PERMISSIONS_DEFAULT_ROUTE_READER]
		};

	const removeUserRoute: IRestRoute<IAdminUserRemoveRequest, INoContentResponse> = {
		operationId: "authenticationAdminRemoveUser",
		summary: "Remove existing user",
		tag: tagsAuthenticationAdmin[0].name,
		method: "DELETE",
		path: `${baseRouteName}/users/:email`,
		handler: async (httpRequestContext, request) =>
			authenticationAdminRemoveUser(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAdminUserRemoveRequest>(),
			examples: [
				{
					id: "removeUserRequestExample",
					description: "The request to remove an existing user.",
					request: {
						pathParams: {
							email: "user@example.com"
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
		defaultPermissions: [PERMISSIONS_DEFAULT_ROUTE_WRITER]
	};

	return [
		createUserRoute,
		updateUserRoute,
		updateUserPasswordRoute,
		getUserRoute,
		getByIdentityUserRoute,
		removeUserRoute
	];
}

/**
 * Create a new user.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @param baseRouteName The base route name to use for the location header.
 * @returns The response object with additional http response properties.
 */
export async function authenticationAdminCreateUser(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAdminUserCreateRequest,
	baseRouteName: string
): Promise<ICreatedResponse> {
	Guards.object<IAdminUserCreateRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAdminUserCreateRequest["body"]>(ROUTES_SOURCE, nameof(request.body), request.body);

	const component = ComponentFactory.get<IAuthenticationAdminComponent>(componentName);
	await component.create(request.body);

	const contextIds = await ContextIdStore.getContextIds();
	const publicOrigin = contextIds?.[HttpContextIdKeys.PublicOrigin];

	const headers: IHttpHeaders = {};
	HttpHeaderHelper.buildId(
		headers,
		request.body.email,
		HttpUrlHelper.combineOriginPath(publicOrigin, `${baseRouteName}/users/:id`)
	);

	return {
		statusCode: HttpStatusCode.created,
		headers
	};
}

/**
 * Update an existing user.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function authenticationAdminUpdateUser(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAdminUserUpdateRequest
): Promise<INoContentResponse> {
	Guards.object<IAdminUserUpdateRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAdminUserUpdateRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);
	Guards.object<IAdminUserUpdateRequest["body"]>(ROUTES_SOURCE, nameof(request.body), request.body);

	const component = ComponentFactory.get<IAuthenticationAdminComponent>(componentName);
	await component.update({
		...request.body,
		email: request.pathParams.email
	});

	return {
		statusCode: HttpStatusCode.noContent
	};
}

/**
 * Update an existing user password.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function authenticationAdminUpdateUserPassword(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAdminUserUpdatePasswordRequest
): Promise<INoContentResponse> {
	Guards.object<IAdminUserUpdatePasswordRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAdminUserUpdatePasswordRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);
	Guards.object<IAdminUserUpdatePasswordRequest["body"]>(
		ROUTES_SOURCE,
		nameof(request.body),
		request.body
	);

	const component = ComponentFactory.get<IAuthenticationAdminComponent>(componentName);
	await component.updatePassword(request.pathParams.email, request.body.newPassword);

	return {
		statusCode: HttpStatusCode.noContent
	};
}

/**
 * Get an existing user.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function authenticationAdminGetUser(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAdminUserGetRequest
): Promise<IAdminUserGetResponse> {
	Guards.object<IAdminUserGetRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAdminUserGetRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);

	const component = ComponentFactory.get<IAuthenticationAdminComponent>(componentName);
	const result = await component.get(request.pathParams.email);

	return {
		body: result
	};
}

/**
 * Get an existing user by identity.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function authenticationAdminGetUserByIdentity(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAdminUserGetByIdentityRequest
): Promise<IAdminUserGetResponse> {
	Guards.object<IAdminUserGetByIdentityRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAdminUserGetByIdentityRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);

	const component = ComponentFactory.get<IAuthenticationAdminComponent>(componentName);
	const result = await component.getByIdentity(request.pathParams.identity);

	return {
		body: result
	};
}

/**
 * Remove an existing user.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function authenticationAdminRemoveUser(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAdminUserRemoveRequest
): Promise<INoContentResponse> {
	Guards.object<IAdminUserRemoveRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAdminUserRemoveRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);

	const component = ComponentFactory.get<IAuthenticationAdminComponent>(componentName);
	await component.remove(request.pathParams.email);

	return {
		statusCode: HttpStatusCode.noContent
	};
}
