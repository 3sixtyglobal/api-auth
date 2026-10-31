// Copyright 2024 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type {
	IAdminUserCreateRequest,
	IAdminUserDisableRequest,
	IAdminUserEnableRequest,
	IAdminUserGetByIdentityRequest,
	IAdminUserGetRequest,
	IAdminUserGetResponse,
	IAdminUserQueryRequest,
	IAdminUserQueryResponse,
	IAdminUserRemoveRequest,
	IAdminUserUpdatePasswordRequest,
	IAdminUserUpdateRequest,
	IAuthenticationAdminComponent
} from "@3sixty/api-auth-entity-storage-models";
import {
	HttpContextIdKeys,
	HttpHeaderHelper,
	HttpUrlHelper,
	type IConflictResponse,
	type ICreatedResponse,
	type IForbiddenResponse,
	type IHttpRequestContext,
	type INoContentResponse,
	type IRestRoute,
	type IRouteAuthorization,
	type ITag,
	type IUnauthorizedResponse
} from "@3sixty/api-models";
import { ContextIdStore } from "@3sixty/context";
import { Coerce, ComponentFactory, Guards } from "@3sixty/core";
import { nameof } from "@3sixty/nameof";
import { HttpStatusCode, type IHttpHeaders } from "@3sixty/web";

/**
 * The source used when communicating about these routes.
 */
const ROUTES_SOURCE = "authenticationAdminRoutes";

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
							password: "MyPassword123!"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<ICreatedResponse>()
			},
			{
				type: nameof<IUnauthorizedResponse>()
			},
			{
				type: nameof<IConflictResponse>()
			}
		],
		defaultAuthorization: DEFAULT_AUTHORIZATION_WRITER
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
		defaultAuthorization: DEFAULT_AUTHORIZATION_WRITER
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
			},
			{
				type: nameof<IForbiddenResponse>()
			}
		],
		defaultAuthorization: DEFAULT_AUTHORIZATION_WRITER
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
								accountId: "6f1c2c0e-4b7a-4f0e-9c1a-2d3e4f5a6b7c"
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
							id: "getUserByIdentityResponseExample",
							description: "The response to get an existing user by identity.",
							response: {
								body: {
									email: "user@example.com",
									accountId: "6f1c2c0e-4b7a-4f0e-9c1a-2d3e4f5a6b7c",
									userIdentity: "did:example:123456789abcdefghi",
									organizationIdentity: "did:example:987654321abcdefghi"
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
		defaultAuthorization: DEFAULT_AUTHORIZATION_WRITER
	};

	const queryUsersRoute: IRestRoute<IAdminUserQueryRequest, IAdminUserQueryResponse> = {
		operationId: "authenticationAdminQueryUsers",
		summary: "Query the users",
		tag: tagsAuthenticationAdmin[0].name,
		method: "GET",
		path: `${baseRouteName}/users`,
		handler: async (httpRequestContext, request) =>
			authenticationAdminQueryUsers(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAdminUserQueryRequest>(),
			examples: [
				{
					id: "queryUsersRequestExample",
					description:
						"The request to query the users with an e-mail address starting with a prefix.",
					request: {
						query: {
							email: "user@",
							authProviderId: "entity-storage"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IAdminUserQueryResponse>(),
				examples: [
					{
						id: "queryUsersResponseExample",
						description: "The users found.",
						response: {
							body: {
								entities: [
									{
										email: "user@example.com",
										accountId: "6f1c2c0e-4b7a-4f0e-9c1a-2d3e4f5a6b7c",
										authProviderId: "entity-storage",
										dateCreated: "2026-01-12T09:05:23.123Z"
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
		],
		defaultAuthorization: DEFAULT_AUTHORIZATION_READER
	};

	const disableUserRoute: IRestRoute<IAdminUserDisableRequest, INoContentResponse> = {
		operationId: "authenticationAdminDisableUser",
		summary: "Disable a user so it cannot sign in",
		tag: tagsAuthenticationAdmin[0].name,
		method: "POST",
		path: `${baseRouteName}/users/:email/disable`,
		handler: async (httpRequestContext, request) =>
			authenticationAdminDisableUser(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAdminUserDisableRequest>(),
			examples: [
				{
					id: "disableUserRequestExample",
					description: "The request to disable a user.",
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
		defaultAuthorization: DEFAULT_AUTHORIZATION_WRITER
	};

	const enableUserRoute: IRestRoute<IAdminUserEnableRequest, INoContentResponse> = {
		operationId: "authenticationAdminEnableUser",
		summary: "Enable a disabled user",
		tag: tagsAuthenticationAdmin[0].name,
		method: "POST",
		path: `${baseRouteName}/users/:email/enable`,
		handler: async (httpRequestContext, request) =>
			authenticationAdminEnableUser(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAdminUserEnableRequest>(),
			examples: [
				{
					id: "enableUserRequestExample",
					description: "The request to enable a user.",
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
		defaultAuthorization: DEFAULT_AUTHORIZATION_WRITER
	};

	return [
		createUserRoute,
		queryUsersRoute,
		updateUserRoute,
		updateUserPasswordRoute,
		disableUserRoute,
		enableUserRoute,
		getUserRoute,
		getByIdentityUserRoute,
		removeUserRoute
	];
}

/**
 * Query the users.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function authenticationAdminQueryUsers(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAdminUserQueryRequest
): Promise<IAdminUserQueryResponse> {
	Guards.object<IAdminUserQueryRequest>(ROUTES_SOURCE, nameof(request), request);

	const component = ComponentFactory.get<IAuthenticationAdminComponent>(componentName);
	return {
		body: await component.query(
			request.query?.email,
			Coerce.boolean(request.query?.exactEmail),
			request.query?.authProviderId,
			request.query?.cursor,
			Coerce.integer(request.query?.limit)
		)
	};
}

/**
 * Disable a user.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function authenticationAdminDisableUser(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAdminUserDisableRequest
): Promise<INoContentResponse> {
	Guards.object<IAdminUserDisableRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAdminUserDisableRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);

	const component = ComponentFactory.get<IAuthenticationAdminComponent>(componentName);
	await component.disable(request.pathParams.email);

	return {
		statusCode: HttpStatusCode.noContent
	};
}

/**
 * Enable a disabled user.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function authenticationAdminEnableUser(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAdminUserEnableRequest
): Promise<INoContentResponse> {
	Guards.object<IAdminUserEnableRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAdminUserEnableRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);

	const component = ComponentFactory.get<IAuthenticationAdminComponent>(componentName);
	await component.enable(request.pathParams.email);

	return {
		statusCode: HttpStatusCode.noContent
	};
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
 * Update the identity or organization of an existing user.
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
		userIdentity: request.body.userIdentity,
		organizationIdentity: request.body.organizationIdentity,
		email: request.pathParams.email
	});

	return {
		statusCode: HttpStatusCode.noContent
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
