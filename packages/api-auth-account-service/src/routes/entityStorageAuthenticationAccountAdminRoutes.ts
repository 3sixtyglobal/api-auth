// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type {
	IAccountAdminIdentityCreateRequest,
	IAccountAdminIdentityExportRequest,
	IAccountIdentityAdoptResponse,
	IAccountAdminIdentityImportRequest,
	IAccountAdminProfileExportRequest,
	IAccountAdminProfileImportRequest,
	IAccountIdentityExportResponse,
	IAccountIdentityImportResponse,
	IAccountProfileExportResponse,
	IAccountProfileImportResponse,
	IAccountDataAdminCreateRequest,
	IAccountDataGetRequest,
	IAccountDataGetResponse,
	IAccountDataAdminQueryRequest,
	IAccountDataQueryResponse,
	IAccountDataRemoveRequest,
	IAccountDataUpdateRequest,
	IAuthenticationAccountAdminComponent
} from "@3sixty/api-auth-models";
import {
	HttpContextIdKeys,
	HttpHeaderHelper,
	HttpUrlHelper,
	type IConflictResponse,
	type ICreatedResponse,
	type IForbiddenResponse,
	type IHttpRequestContext,
	type INoContentResponse,
	type INotFoundResponse,
	type IRestRoute,
	type IRouteAuthorization,
	type ITag,
	type IUnauthorizedResponse,
	type IUnprocessableEntityResponse
} from "@3sixty/api-models";
import { ContextIdStore } from "@3sixty/context";
import { Coerce, ComponentFactory, Guards } from "@3sixty/core";
import { nameof } from "@3sixty/nameof";
import { HeaderTypes, HttpStatusCode, type IHttpHeaders } from "@3sixty/web";

/**
 * The source used when communicating about these routes.
 */
const ROUTES_SOURCE = "authenticationAccountAdminRoutes";

/**
 * The cache control of an export, which is never kept by a cache.
 */
const NO_STORE = "no-store";

/**
 * The account used in the route examples.
 */
const EXAMPLE_ACCOUNT_ID = "01a17afb-e05f-7939-83f2-d4f04c4bdf2e";

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
export const tagsAuthenticationAccountAdmin: ITag[] = [
	{
		name: "Authentication Account Admin",
		description: "Endpoints to manage the data stored for any account."
	}
];

/**
 * The REST routes for the data of any account.
 * @param baseRouteName Prefix to prepend to the paths.
 * @param componentName The name of the component to use in the routes stored in the ComponentFactory.
 * @returns The generated routes.
 */
export function generateRestRoutesAuthenticationAccountAdmin(
	baseRouteName: string,
	componentName: string
): IRestRoute[] {
	const createRoute: IRestRoute<IAccountDataAdminCreateRequest, ICreatedResponse> = {
		operationId: "authenticationAccountAdminCreate",
		summary: "Store an item of account data",
		tag: tagsAuthenticationAccountAdmin[0].name,
		method: "POST",
		path: `${baseRouteName}`,
		handler: async (httpRequestContext, request) =>
			authenticationAccountAdminCreate(httpRequestContext, componentName, request, baseRouteName),
		requestType: {
			type: nameof<IAccountDataAdminCreateRequest>(),
			examples: [
				{
					id: "authenticationAccountAdminCreateRequestExample",
					description: "The request to store an item of account data.",
					request: {
						body: {
							accountId: "01a17afb-e05f-7939-83f2-d4f04c4bdf2e",
							type: "organization",
							data: {
								"@context": "https://schema.org",
								"@type": "Organization",
								identifier: "did:example:123456789abcdefghi"
							},
							isDefault: true
						}
					}
				},
				{
					id: "authenticationAccountAdminCreateIdentityRequestExample",
					description:
						"The request to bind an identity to an account, with the proof that the DID is owned by it.",
					request: {
						body: {
							accountId: "01a17afb-e05f-7939-83f2-d4f04c4bdf2e",
							type: "identity",
							data: {
								"@context": "https://www.w3.org/ns/did/v1",
								id: "did:example:123456789abcdefghi"
							},
							proof: {
								type: "DataIntegrityProof",
								cryptosuite: "eddsa-jcs-2022",
								created: "2026-01-12T09:05:23.123Z",
								verificationMethod: "did:example:123456789abcdefghi#key-1",
								proofPurpose: "authentication",
								proofValue:
									"z3FXQjecWufY46yg5abdVZsXqLhxhueuSoZgNSARiKBk9czhSePTFehP8c3PGfb6a22gkfUKKiZpYMRRtnp7YZzKt"
							}
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
			}
		],
		defaultAuthorization: DEFAULT_AUTHORIZATION_WRITER
	};

	const getRoute: IRestRoute<IAccountDataGetRequest, IAccountDataGetResponse> = {
		operationId: "authenticationAccountAdminGet",
		summary: "Get an item of account data",
		tag: tagsAuthenticationAccountAdmin[0].name,
		method: "GET",
		path: `${baseRouteName}/:id`,
		handler: async (httpRequestContext, request) =>
			authenticationAccountAdminGet(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAccountDataGetRequest>(),
			examples: [
				{
					id: "authenticationAccountAdminGetRequestExample",
					description: "The request to get an item of account data.",
					request: {
						pathParams: {
							id: "01a17afc-611a-7d5b-a898-e0e20088b36e"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IAccountDataGetResponse>(),
				examples: [
					{
						id: "authenticationAccountAdminGetResponseExample",
						description: "The item of account data.",
						response: {
							body: {
								id: "01a17afc-611a-7d5b-a898-e0e20088b36e",
								accountId: "01a17afb-e05f-7939-83f2-d4f04c4bdf2e",
								type: "identity",
								data: {
									"@context": "https://www.w3.org/ns/did/v1",
									id: "did:example:123456789abcdefghi"
								},
								isDefault: true,
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

	const updateRoute: IRestRoute<IAccountDataUpdateRequest, INoContentResponse> = {
		operationId: "authenticationAccountAdminUpdate",
		summary: "Replace the value of an item of account data",
		tag: tagsAuthenticationAccountAdmin[0].name,
		method: "PUT",
		path: `${baseRouteName}/:id`,
		handler: async (httpRequestContext, request) =>
			authenticationAccountAdminUpdate(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAccountDataUpdateRequest>(),
			examples: [
				{
					id: "authenticationAccountAdminUpdateRequestExample",
					description: "The request to replace the value of an item of account data.",
					request: {
						pathParams: {
							id: "01a17afc-611a-7d5b-a898-e0e20088b36e"
						},
						body: {
							data: {
								"@context": "https://schema.org",
								"@type": "Person",
								name: "Alice Smith"
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
				type: nameof<INotFoundResponse>()
			},
			{
				type: nameof<IForbiddenResponse>()
			},
			{
				type: nameof<IUnauthorizedResponse>()
			}
		],
		defaultAuthorization: DEFAULT_AUTHORIZATION_WRITER
	};

	const removeRoute: IRestRoute<IAccountDataRemoveRequest, INoContentResponse> = {
		operationId: "authenticationAccountAdminRemove",
		summary: "Remove an item of account data",
		tag: tagsAuthenticationAccountAdmin[0].name,
		method: "DELETE",
		path: `${baseRouteName}/:id`,
		handler: async (httpRequestContext, request) =>
			authenticationAccountAdminRemove(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAccountDataRemoveRequest>(),
			examples: [
				{
					id: "authenticationAccountAdminRemoveRequestExample",
					description: "The request to remove an item of account data.",
					request: {
						pathParams: {
							id: "01a17afc-611a-7d5b-a898-e0e20088b36e"
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
				type: nameof<IForbiddenResponse>()
			},
			{
				type: nameof<IUnauthorizedResponse>()
			}
		],
		defaultAuthorization: DEFAULT_AUTHORIZATION_WRITER
	};

	const queryRoute: IRestRoute<IAccountDataAdminQueryRequest, IAccountDataQueryResponse> = {
		operationId: "authenticationAccountAdminQuery",
		summary: "Query the items of account data",
		tag: tagsAuthenticationAccountAdmin[0].name,
		method: "GET",
		path: `${baseRouteName}`,
		handler: async (httpRequestContext, request) =>
			authenticationAccountAdminQuery(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAccountDataAdminQueryRequest>(),
			examples: [
				{
					id: "authenticationAccountAdminQueryRequestExample",
					description: "The request to query the verifiable credentials of an account.",
					request: {
						query: {
							accountId: "01a17afb-e05f-7939-83f2-d4f04c4bdf2e",
							type: "vc"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IAccountDataQueryResponse>()
			},
			{
				type: nameof<IUnauthorizedResponse>()
			}
		],
		defaultAuthorization: DEFAULT_AUTHORIZATION_READER
	};

	const createIdentityRoute: IRestRoute<
		IAccountAdminIdentityCreateRequest,
		IAccountIdentityAdoptResponse
	> = {
		operationId: "authenticationAccountAdminCreateIdentity",
		summary: "Create an identity with keys the node holds for an account that has none",
		tag: tagsAuthenticationAccountAdmin[0].name,
		method: "POST",
		path: `${baseRouteName}/:accountId/identity`,
		handler: async (httpRequestContext, request) =>
			authenticationAccountAdminCreateIdentity(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAccountAdminIdentityCreateRequest>(),
			examples: [
				{
					id: "authenticationAccountAdminCreateIdentityRequestExample",
					description: "The request to create an identity for an account.",
					request: { pathParams: { accountId: EXAMPLE_ACCOUNT_ID } }
				}
			]
		},
		responseType: [
			{
				type: nameof<IAccountIdentityAdoptResponse>()
			},
			{
				type: nameof<INotFoundResponse>()
			},
			{
				type: nameof<IConflictResponse>()
			},
			{
				type: nameof<IForbiddenResponse>()
			},
			{
				type: nameof<IUnauthorizedResponse>()
			}
		],
		defaultAuthorization: DEFAULT_AUTHORIZATION_WRITER
	};

	const exportIdentityRoute: IRestRoute<
		IAccountAdminIdentityExportRequest,
		IAccountIdentityExportResponse
	> = {
		operationId: "authenticationAccountAdminExportIdentity",
		summary:
			"Export the identity of an account with its private keys, needs a recent sign in by the caller",
		tag: tagsAuthenticationAccountAdmin[0].name,
		method: "POST",
		path: `${baseRouteName}/:accountId/identity/export`,
		handler: async (httpRequestContext, request) =>
			authenticationAccountAdminExportIdentity(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAccountAdminIdentityExportRequest>(),
			examples: [
				{
					id: "authenticationAccountAdminExportIdentityRequestExample",
					description: "The request to export the identity of an account.",
					request: { pathParams: { accountId: EXAMPLE_ACCOUNT_ID } }
				}
			]
		},
		responseType: [
			{
				type: nameof<IAccountIdentityExportResponse>()
			},
			{
				type: nameof<IForbiddenResponse>()
			},
			{
				type: nameof<INotFoundResponse>()
			},
			{
				type: nameof<IUnprocessableEntityResponse>()
			},
			{
				type: nameof<IUnauthorizedResponse>()
			}
		],
		defaultAuthorization: DEFAULT_AUTHORIZATION_WRITER
	};

	const importIdentityRoute: IRestRoute<
		IAccountAdminIdentityImportRequest,
		IAccountIdentityImportResponse
	> = {
		operationId: "authenticationAccountAdminImportIdentity",
		summary: "Import an identity into an account that has none",
		tag: tagsAuthenticationAccountAdmin[0].name,
		method: "POST",
		path: `${baseRouteName}/:accountId/identity/import`,
		handler: async (httpRequestContext, request) =>
			authenticationAccountAdminImportIdentity(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAccountAdminIdentityImportRequest>()
		},
		responseType: [
			{
				type: nameof<IAccountIdentityImportResponse>()
			},
			{
				type: nameof<INotFoundResponse>()
			},
			{
				type: nameof<IConflictResponse>()
			},
			{
				type: nameof<IForbiddenResponse>()
			},
			{
				type: nameof<IUnprocessableEntityResponse>()
			},
			{
				type: nameof<IUnauthorizedResponse>()
			}
		],
		defaultAuthorization: DEFAULT_AUTHORIZATION_WRITER
	};

	const exportProfileRoute: IRestRoute<
		IAccountAdminProfileExportRequest,
		IAccountProfileExportResponse
	> = {
		operationId: "authenticationAccountAdminExportProfile",
		summary: "Export the account data of an account",
		tag: tagsAuthenticationAccountAdmin[0].name,
		method: "GET",
		path: `${baseRouteName}/:accountId/export`,
		handler: async (httpRequestContext, request) =>
			authenticationAccountAdminExportProfile(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAccountAdminProfileExportRequest>(),
			examples: [
				{
					id: "authenticationAccountAdminExportProfileRequestExample",
					description: "The request to export the account data of an account.",
					request: { pathParams: { accountId: EXAMPLE_ACCOUNT_ID } }
				}
			]
		},
		responseType: [
			{
				type: nameof<IAccountProfileExportResponse>()
			},
			{
				type: nameof<INotFoundResponse>()
			},
			{
				type: nameof<IForbiddenResponse>()
			},
			{
				type: nameof<IUnprocessableEntityResponse>()
			},
			{
				type: nameof<IUnauthorizedResponse>()
			}
		],
		defaultAuthorization: DEFAULT_AUTHORIZATION_READER
	};

	const importProfileRoute: IRestRoute<
		IAccountAdminProfileImportRequest,
		IAccountProfileImportResponse
	> = {
		operationId: "authenticationAccountAdminImportProfile",
		summary: "Replace the account data of an account with an export",
		tag: tagsAuthenticationAccountAdmin[0].name,
		method: "POST",
		path: `${baseRouteName}/:accountId/import`,
		handler: async (httpRequestContext, request) =>
			authenticationAccountAdminImportProfile(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAccountAdminProfileImportRequest>()
		},
		responseType: [
			{
				type: nameof<IAccountProfileImportResponse>()
			},
			{
				type: nameof<INotFoundResponse>()
			},
			{
				type: nameof<IForbiddenResponse>()
			},
			{
				type: nameof<IUnprocessableEntityResponse>()
			},
			{
				type: nameof<IUnauthorizedResponse>()
			}
		],
		defaultAuthorization: DEFAULT_AUTHORIZATION_WRITER
	};

	return [
		createRoute,
		createIdentityRoute,
		exportIdentityRoute,
		importIdentityRoute,
		exportProfileRoute,
		importProfileRoute,
		getRoute,
		updateRoute,
		removeRoute,
		queryRoute
	];
}

/**
 * Create an identity with keys the node holds for an account that has none.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function authenticationAccountAdminCreateIdentity(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAccountAdminIdentityCreateRequest
): Promise<IAccountIdentityAdoptResponse> {
	Guards.object<IAccountAdminIdentityCreateRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAccountAdminIdentityCreateRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);

	const component = ComponentFactory.get<IAuthenticationAccountAdminComponent>(componentName);
	return {
		body: { identity: await component.createIdentity(request.pathParams.accountId) }
	};
}

/**
 * Export the identity of an account, the session of the caller must have started recently.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function authenticationAccountAdminExportIdentity(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAccountAdminIdentityExportRequest
): Promise<IAccountIdentityExportResponse> {
	Guards.object<IAccountAdminIdentityExportRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAccountAdminIdentityExportRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);

	const component = ComponentFactory.get<IAuthenticationAccountAdminComponent>(componentName);
	const exported = await component.exportIdentity(
		request.pathParams.accountId,
		Coerce.integer(httpRequestContext.processorState?.authSessionStart)
	);
	return {
		// The export holds private keys, so it is never kept by a cache.
		headers: { [HeaderTypes.CacheControl]: NO_STORE },
		body: exported
	};
}

/**
 * Import an identity into an account that has none.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function authenticationAccountAdminImportIdentity(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAccountAdminIdentityImportRequest
): Promise<IAccountIdentityImportResponse> {
	Guards.object<IAccountAdminIdentityImportRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAccountAdminIdentityImportRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);
	// A JSON body is required, so a cross-site form post cannot import an identity.
	Guards.object<IAccountAdminIdentityImportRequest["body"]>(
		ROUTES_SOURCE,
		nameof(request.body),
		request.body
	);

	const component = ComponentFactory.get<IAuthenticationAccountAdminComponent>(componentName);
	return {
		body: await component.importIdentity(request.pathParams.accountId, request.body)
	};
}

/**
 * Export the account data of an account.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function authenticationAccountAdminExportProfile(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAccountAdminProfileExportRequest
): Promise<IAccountProfileExportResponse> {
	Guards.object<IAccountAdminProfileExportRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAccountAdminProfileExportRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);

	const component = ComponentFactory.get<IAuthenticationAccountAdminComponent>(componentName);
	return {
		// The export holds personal data, so it is never kept by a cache.
		headers: { [HeaderTypes.CacheControl]: NO_STORE },
		body: await component.exportProfile(request.pathParams.accountId)
	};
}

/**
 * Replace the account data of an account with an export.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function authenticationAccountAdminImportProfile(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAccountAdminProfileImportRequest
): Promise<IAccountProfileImportResponse> {
	Guards.object<IAccountAdminProfileImportRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAccountAdminProfileImportRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);
	Guards.object<IAccountAdminProfileImportRequest["body"]>(
		ROUTES_SOURCE,
		nameof(request.body),
		request.body
	);

	const component = ComponentFactory.get<IAuthenticationAccountAdminComponent>(componentName);
	return {
		body: await component.importProfile(request.pathParams.accountId, request.body)
	};
}

/**
 * Store an item of account data.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @param baseRouteName The base route name to use for the location header.
 * @returns The response object with additional http response properties.
 */
export async function authenticationAccountAdminCreate(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAccountDataAdminCreateRequest,
	baseRouteName: string
): Promise<ICreatedResponse> {
	Guards.object<IAccountDataAdminCreateRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAccountDataAdminCreateRequest["body"]>(
		ROUTES_SOURCE,
		nameof(request.body),
		request.body
	);

	const component = ComponentFactory.get<IAuthenticationAccountAdminComponent>(componentName);
	const id = await component.create(
		request.body.accountId,
		request.body.type,
		request.body.data,
		request.body.isDefault,
		request.body.proof
	);

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
 * Get an item of account data.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function authenticationAccountAdminGet(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAccountDataGetRequest
): Promise<IAccountDataGetResponse> {
	Guards.object<IAccountDataGetRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAccountDataGetRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);

	const component = ComponentFactory.get<IAuthenticationAccountAdminComponent>(componentName);
	return {
		body: await component.get(request.pathParams.id)
	};
}

/**
 * Replace the value of an item of account data.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function authenticationAccountAdminUpdate(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAccountDataUpdateRequest
): Promise<INoContentResponse> {
	Guards.object<IAccountDataUpdateRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAccountDataUpdateRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);
	Guards.object<IAccountDataUpdateRequest["body"]>(
		ROUTES_SOURCE,
		nameof(request.body),
		request.body
	);

	const component = ComponentFactory.get<IAuthenticationAccountAdminComponent>(componentName);
	await component.update(request.pathParams.id, request.body.data, request.body.isDefault);

	return {
		statusCode: HttpStatusCode.noContent
	};
}

/**
 * Remove an item of account data.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function authenticationAccountAdminRemove(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAccountDataRemoveRequest
): Promise<INoContentResponse> {
	Guards.object<IAccountDataRemoveRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAccountDataRemoveRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);

	const component = ComponentFactory.get<IAuthenticationAccountAdminComponent>(componentName);
	await component.remove(request.pathParams.id);

	return {
		statusCode: HttpStatusCode.noContent
	};
}

/**
 * Query the items of account data.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function authenticationAccountAdminQuery(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAccountDataAdminQueryRequest
): Promise<IAccountDataQueryResponse> {
	Guards.object<IAccountDataAdminQueryRequest>(ROUTES_SOURCE, nameof(request), request);

	const component = ComponentFactory.get<IAuthenticationAccountAdminComponent>(componentName);
	const result = await component.query(
		request.query?.accountId,
		request.query?.type,
		request.query?.cursor,
		Coerce.integer(request.query?.limit)
	);

	return {
		body: result
	};
}
