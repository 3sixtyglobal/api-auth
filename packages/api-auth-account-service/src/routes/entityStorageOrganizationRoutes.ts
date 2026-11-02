// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import {
	ExportFileHelper,
	ExportFileType,
	type IOrganizationAdminAddRequest,
	type IOrganizationAdminRemoveRequest,
	type IOrganizationComponent,
	type IOrganizationCreateRequest,
	type IOrganizationGetRequest,
	type IOrganizationGetResponse,
	type IOrganizationIdentityExportRequest,
	type IOrganizationIdentityExportResponse,
	type IOrganizationMemberQueryRequest,
	type IOrganizationMemberQueryResponse,
	type IOrganizationQueryRequest,
	type IOrganizationQueryResponse,
	type IOrganizationRemoveRequest,
	type IOrganizationSearchRequest,
	type IOrganizationSearchResponse,
	type IOrganizationUpdateRequest
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
	type ITooManyRequestsResponse,
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
const ROUTES_SOURCE = "organizationRoutes";

/**
 * The cache control of the exports, which are never kept by a cache.
 */
const NO_STORE = "no-store";

/**
 * The default authorization for the routes only admins may call, used to seed authorization rules.
 * User admins manage every organization of the tenant, global admins hold escalated privilege.
 */
const DEFAULT_AUTHORIZATION_ADMIN_READER: IRouteAuthorization = {
	permission: "organization-admin:read",
	role: "user-admin"
};
const DEFAULT_AUTHORIZATION_ADMIN_WRITER: IRouteAuthorization = {
	permission: "organization-admin:write",
	role: "user-admin",
	inherits: [DEFAULT_AUTHORIZATION_ADMIN_READER.permission]
};

/**
 * The tag to associate with the routes.
 */
export const tagsOrganization: ITag[] = [
	{
		name: "Organization",
		description:
			"Endpoints to manage the organizations registered on the node and read their profiles."
	}
];

/**
 * The example organization id used in the route examples.
 */
const EXAMPLE_ORGANIZATION_ID = "01a17afc-611a-7d5b-a898-e0e20088b36f";

/**
 * The example organization DID used in the route examples.
 */
const EXAMPLE_ORGANIZATION_IDENTITY = "did:example:organization";

/**
 * The REST routes for the organizations.
 * @param baseRouteName Prefix to prepend to the paths.
 * @param componentName The name of the component to use in the routes stored in the ComponentFactory.
 * @returns The generated routes.
 */
export function generateRestRoutesOrganization(
	baseRouteName: string,
	componentName: string
): IRestRoute[] {
	const createRoute: IRestRoute<IOrganizationCreateRequest, ICreatedResponse> = {
		operationId: "organizationCreate",
		summary: "Create an organization, a node controlled DID is created when none is given",
		tag: tagsOrganization[0].name,
		method: "POST",
		path: `${baseRouteName}`,
		handler: async (httpRequestContext, request) =>
			organizationCreate(httpRequestContext, componentName, request, baseRouteName),
		requestType: {
			type: nameof<IOrganizationCreateRequest>(),
			examples: [
				{
					id: "organizationCreateRequestExample",
					description:
						"The request to create an organization, the caller becomes its first member and org admin.",
					request: {
						body: {
							profile: {
								"@context": "https://schema.org",
								"@type": "Organization",
								name: "Example Ltd"
							},
							publicData: ["profile.name"]
						}
					}
				},
				{
					id: "organizationCreateFromImportRequestExample",
					description:
						"The request to create an organization from an identity export of another node.",
					request: {
						body: {
							identityImport: {
								type: ExportFileType.OrganizationIdentity,
								version: ExportFileHelper.VERSION,
								identity: {
									version: 1,
									namespace: "entity-storage",
									selfControlled: false,
									document: {
										"@context": "https://www.w3.org/ns/did/v1",
										id: "did:entity-storage:0xfedcba9876543210"
									},
									documentSignature: "base64-signature",
									keys: [
										{
											id: "did",
											type: "Ed25519",
											privateKey: "base64-private-key",
											publicKey: "base64-public-key"
										}
									]
								},
								nextRevocationIndex: 12
							},
							profile: {
								"@context": "https://schema.org",
								"@type": "Organization",
								name: "Example Ltd"
							},
							publicData: ["profile.name"]
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
						id: "organizationCreateResponseExample",
						description: "The location of the organization created.",
						response: {
							statusCode: HttpStatusCode.created,
							headers: {
								location: EXAMPLE_ORGANIZATION_ID
							}
						}
					}
				]
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
		defaultAuthorization: DEFAULT_AUTHORIZATION_ADMIN_WRITER
	};

	const queryRoute: IRestRoute<IOrganizationQueryRequest, IOrganizationQueryResponse> = {
		operationId: "organizationQuery",
		summary: "Query the organizations",
		tag: tagsOrganization[0].name,
		method: "GET",
		path: `${baseRouteName}`,
		handler: async (httpRequestContext, request) =>
			organizationQuery(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IOrganizationQueryRequest>(),
			examples: [
				{
					id: "organizationQueryRequestExample",
					description: "The request to query the organizations.",
					request: {
						query: {
							limit: "10"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IOrganizationQueryResponse>()
			},
			{
				type: nameof<IForbiddenResponse>()
			},
			{
				type: nameof<IUnauthorizedResponse>()
			}
		],
		defaultAuthorization: DEFAULT_AUTHORIZATION_ADMIN_READER
	};

	const searchRoute: IRestRoute<IOrganizationSearchRequest, IOrganizationSearchResponse> = {
		operationId: "organizationSearch",
		summary: "Search the organizations whose name starts with the text given",
		tag: tagsOrganization[0].name,
		method: "GET",
		path: `${baseRouteName}/search`,
		handler: async (httpRequestContext, request) =>
			organizationSearch(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IOrganizationSearchRequest>(),
			examples: [
				{
					id: "organizationSearchRequestExample",
					description: "The request to search the organizations by name.",
					request: {
						query: {
							name: "exam",
							limit: "10"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IOrganizationSearchResponse>(),
				examples: [
					{
						id: "organizationSearchResponseExample",
						description:
							"The organizations with their names and the public properties of their profiles.",
						response: {
							body: {
								entities: [
									{
										id: EXAMPLE_ORGANIZATION_ID,
										identity: EXAMPLE_ORGANIZATION_IDENTITY,
										profile: {
											"@context": "https://schema.org",
											"@type": "Organization",
											name: "Example Ltd"
										},
										dateCreated: "2026-01-12T09:05:23.123Z",
										dateModified: "2026-01-12T09:05:23.123Z"
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
		requiresAuthorization: false
	};

	const getRoute: IRestRoute<IOrganizationGetRequest, IOrganizationGetResponse> = {
		operationId: "organizationGet",
		summary:
			"Get an organization, the profile, logo and public data are only included for its members and admins",
		tag: tagsOrganization[0].name,
		method: "GET",
		path: `${baseRouteName}/:id`,
		handler: async (httpRequestContext, request) =>
			organizationGet(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IOrganizationGetRequest>(),
			examples: [
				{
					id: "organizationGetRequestExample",
					description: "The request to get an organization by its DID.",
					request: {
						pathParams: {
							id: EXAMPLE_ORGANIZATION_IDENTITY
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IOrganizationGetResponse>(),
				examples: [
					{
						id: "organizationGetResponseExample",
						description: "The organization.",
						response: {
							body: {
								id: EXAMPLE_ORGANIZATION_ID,
								identity: EXAMPLE_ORGANIZATION_IDENTITY,
								profile: {
									"@context": "https://schema.org",
									"@type": "Organization",
									name: "Example Ltd",
									url: "https://example.com"
								},
								publicData: ["profile.name"],
								isAdmin: true,
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
		requiresAuthorization: false
	};

	const updateRoute: IRestRoute<IOrganizationUpdateRequest, INoContentResponse> = {
		operationId: "organizationUpdate",
		summary: "Change the profile, logo and public data of an organization",
		tag: tagsOrganization[0].name,
		method: "PUT",
		path: `${baseRouteName}/:id`,
		handler: async (httpRequestContext, request) =>
			organizationUpdate(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IOrganizationUpdateRequest>(),
			examples: [
				{
					id: "organizationUpdateRequestExample",
					description: "The request to replace the profile of an organization and its public data.",
					request: {
						pathParams: {
							id: EXAMPLE_ORGANIZATION_ID
						},
						body: {
							profile: {
								"@context": "https://schema.org",
								"@type": "Organization",
								name: "Example Ltd",
								telephone: "+44 20 7946 0000"
							},
							publicData: ["profile.name", "logo"]
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
				type: nameof<IUnprocessableEntityResponse>()
			},
			{
				type: nameof<IUnauthorizedResponse>()
			}
		],
		// The service checks the caller is an org admin of the organization or an admin.
		requiresAuthorization: false
	};

	const removeRoute: IRestRoute<IOrganizationRemoveRequest, INoContentResponse> = {
		operationId: "organizationRemove",
		summary:
			"Remove an organization that has no members, or of which the calling org admin is the only member",
		tag: tagsOrganization[0].name,
		method: "DELETE",
		path: `${baseRouteName}/:id`,
		handler: async (httpRequestContext, request) =>
			organizationRemove(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IOrganizationRemoveRequest>(),
			examples: [
				{
					id: "organizationRemoveRequestExample",
					description: "The request to remove an organization.",
					request: {
						pathParams: {
							id: EXAMPLE_ORGANIZATION_ID
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
				type: nameof<IForbiddenResponse>()
			},
			{
				type: nameof<IUnauthorizedResponse>()
			}
		],
		// The service checks the caller is an org admin of the organization or an admin.
		requiresAuthorization: false
	};

	const memberQueryRoute: IRestRoute<
		IOrganizationMemberQueryRequest,
		IOrganizationMemberQueryResponse
	> = {
		operationId: "organizationMemberQuery",
		summary: "Query the members of an organization",
		tag: tagsOrganization[0].name,
		method: "GET",
		path: `${baseRouteName}/:id/member`,
		handler: async (httpRequestContext, request) =>
			organizationMemberQuery(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IOrganizationMemberQueryRequest>(),
			examples: [
				{
					id: "organizationMemberQueryRequestExample",
					description: "The request to query the members of an organization.",
					request: {
						pathParams: {
							id: EXAMPLE_ORGANIZATION_ID
						},
						query: {
							limit: "10"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IOrganizationMemberQueryResponse>(),
				examples: [
					{
						id: "organizationMemberQueryResponseExample",
						description: "The members of the organization.",
						response: {
							body: {
								entities: [
									{
										accountId: "01a17afb-e05f-7939-83f2-d4f04c4bdf2e",
										email: "alice@example.com",
										name: "Alice Smith",
										isAdmin: true
									}
								]
							}
						}
					}
				]
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
		// The service checks the caller is a member, an org admin of the organization or an admin.
		requiresAuthorization: false
	};

	const adminAddRoute: IRestRoute<IOrganizationAdminAddRequest, INoContentResponse> = {
		operationId: "organizationAdminAdd",
		summary: "Make a member an org admin of an organization",
		tag: tagsOrganization[0].name,
		method: "PUT",
		path: `${baseRouteName}/:id/admin/:accountId`,
		handler: async (httpRequestContext, request) =>
			organizationAdminAdd(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IOrganizationAdminAddRequest>(),
			examples: [
				{
					id: "organizationAdminAddRequestExample",
					description: "The request to make a member an org admin.",
					request: {
						pathParams: {
							id: EXAMPLE_ORGANIZATION_ID,
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
				type: nameof<INotFoundResponse>()
			},
			{
				type: nameof<IForbiddenResponse>()
			},
			{
				type: nameof<IUnauthorizedResponse>()
			}
		],
		// The service checks the caller is an org admin of the organization or an admin.
		requiresAuthorization: false
	};

	const adminRemoveRoute: IRestRoute<IOrganizationAdminRemoveRequest, INoContentResponse> = {
		operationId: "organizationAdminRemove",
		summary: "Stop a member being an org admin of an organization",
		tag: tagsOrganization[0].name,
		method: "DELETE",
		path: `${baseRouteName}/:id/admin/:accountId`,
		handler: async (httpRequestContext, request) =>
			organizationAdminRemove(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IOrganizationAdminRemoveRequest>(),
			examples: [
				{
					id: "organizationAdminRemoveRequestExample",
					description: "The request to stop a member being an org admin.",
					request: {
						pathParams: {
							id: EXAMPLE_ORGANIZATION_ID,
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
		// The service checks the caller is an org admin of the organization or an admin.
		requiresAuthorization: false
	};

	const exportIdentityRoute: IRestRoute<
		IOrganizationIdentityExportRequest,
		IOrganizationIdentityExportResponse
	> = {
		operationId: "organizationExportIdentity",
		summary: "Export the identity of an organization with its private keys, needs a recent sign in",
		tag: tagsOrganization[0].name,
		method: "POST",
		path: `${baseRouteName}/:id/export`,
		handler: async (httpRequestContext, request) =>
			organizationExportIdentity(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IOrganizationIdentityExportRequest>(),
			examples: [
				{
					id: "organizationExportIdentityRequestExample",
					description: "The request to export the identity of an organization.",
					request: {
						pathParams: {
							id: EXAMPLE_ORGANIZATION_IDENTITY
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IOrganizationIdentityExportResponse>(),
				examples: [
					{
						id: "organizationExportIdentityResponseExample",
						description: "The identity of the organization, which holds private keys.",
						response: {
							headers: {
								[HeaderTypes.CacheControl]: NO_STORE
							},
							body: {
								type: ExportFileType.OrganizationIdentity,
								version: ExportFileHelper.VERSION,
								identity: {
									version: 1,
									namespace: "entity-storage",
									selfControlled: false,
									document: {
										"@context": "https://www.w3.org/ns/did/v1",
										id: "did:entity-storage:0xfedcba9876543210"
									},
									documentSignature: "base64-signature",
									keys: [
										{
											id: "did",
											type: "Ed25519",
											privateKey: "base64-private-key",
											publicKey: "base64-public-key"
										}
									]
								},
								nextRevocationIndex: 12
							}
						}
					}
				]
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
				type: nameof<ITooManyRequestsResponse>()
			},
			{
				type: nameof<IUnauthorizedResponse>()
			}
		],
		defaultAuthorization: DEFAULT_AUTHORIZATION_ADMIN_WRITER
	};

	return [
		createRoute,
		queryRoute,
		searchRoute,
		getRoute,
		updateRoute,
		removeRoute,
		memberQueryRoute,
		adminAddRoute,
		adminRemoveRoute,
		exportIdentityRoute
	];
}

/**
 * Export the identity of an organization, the session must have started recently.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function organizationExportIdentity(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IOrganizationIdentityExportRequest
): Promise<IOrganizationIdentityExportResponse> {
	Guards.object<IOrganizationIdentityExportRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IOrganizationIdentityExportRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);

	const component = ComponentFactory.get<IOrganizationComponent>(componentName);
	const exported = await component.exportIdentity(
		request.pathParams.id,
		Coerce.integer(httpRequestContext.processorState?.authSessionStart)
	);

	return {
		// The export holds private keys, so it is never kept by a cache.
		headers: {
			[HeaderTypes.CacheControl]: NO_STORE
		},
		body: exported
	};
}

/**
 * Create an organization.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @param baseRouteName The base route name to use for the location header.
 * @returns The response object with additional http response properties.
 */
export async function organizationCreate(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IOrganizationCreateRequest,
	baseRouteName: string
): Promise<ICreatedResponse> {
	Guards.object<IOrganizationCreateRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IOrganizationCreateRequest["body"]>(
		ROUTES_SOURCE,
		nameof(request.body),
		request.body
	);

	const component = ComponentFactory.get<IOrganizationComponent>(componentName);
	const organization = await component.create(request.body);

	const contextIds = await ContextIdStore.getContextIds();
	const publicOrigin = contextIds?.[HttpContextIdKeys.PublicOrigin];

	const headers: IHttpHeaders = {};
	HttpHeaderHelper.buildId(
		headers,
		organization.id,
		HttpUrlHelper.combineOriginPath(publicOrigin, `${baseRouteName}/:id`)
	);

	return {
		statusCode: HttpStatusCode.created,
		headers
	};
}

/**
 * Query the organizations.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function organizationQuery(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IOrganizationQueryRequest
): Promise<IOrganizationQueryResponse> {
	Guards.object<IOrganizationQueryRequest>(ROUTES_SOURCE, nameof(request), request);

	const component = ComponentFactory.get<IOrganizationComponent>(componentName);
	return {
		body: await component.query(request.query?.cursor, Coerce.integer(request.query?.limit))
	};
}

/**
 * Search the organizations by name.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function organizationSearch(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IOrganizationSearchRequest
): Promise<IOrganizationSearchResponse> {
	Guards.object<IOrganizationSearchRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IOrganizationSearchRequest["query"]>(
		ROUTES_SOURCE,
		nameof(request.query),
		request.query
	);

	const component = ComponentFactory.get<IOrganizationComponent>(componentName);
	return {
		body: await component.search(request.query.name, Coerce.integer(request.query.limit))
	};
}

/**
 * Get an organization.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function organizationGet(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IOrganizationGetRequest
): Promise<IOrganizationGetResponse> {
	Guards.object<IOrganizationGetRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IOrganizationGetRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);

	const component = ComponentFactory.get<IOrganizationComponent>(componentName);
	return {
		body: await component.get(request.pathParams.id)
	};
}

/**
 * Change the profile, logo and public data of an organization.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function organizationUpdate(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IOrganizationUpdateRequest
): Promise<INoContentResponse> {
	Guards.object<IOrganizationUpdateRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IOrganizationUpdateRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);
	Guards.object<IOrganizationUpdateRequest["body"]>(
		ROUTES_SOURCE,
		nameof(request.body),
		request.body
	);

	const component = ComponentFactory.get<IOrganizationComponent>(componentName);
	await component.update(request.pathParams.id, request.body);

	return {
		statusCode: HttpStatusCode.noContent
	};
}

/**
 * Remove an organization.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function organizationRemove(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IOrganizationRemoveRequest
): Promise<INoContentResponse> {
	Guards.object<IOrganizationRemoveRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IOrganizationRemoveRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);

	const component = ComponentFactory.get<IOrganizationComponent>(componentName);
	await component.remove(request.pathParams.id);

	return {
		statusCode: HttpStatusCode.noContent
	};
}

/**
 * Query the members of an organization.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function organizationMemberQuery(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IOrganizationMemberQueryRequest
): Promise<IOrganizationMemberQueryResponse> {
	Guards.object<IOrganizationMemberQueryRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IOrganizationMemberQueryRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);

	const component = ComponentFactory.get<IOrganizationComponent>(componentName);
	return {
		body: await component.queryMembers(
			request.pathParams.id,
			request.query?.cursor,
			Coerce.integer(request.query?.limit)
		)
	};
}

/**
 * Make a member an org admin of an organization.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function organizationAdminAdd(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IOrganizationAdminAddRequest
): Promise<INoContentResponse> {
	Guards.object<IOrganizationAdminAddRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IOrganizationAdminAddRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);

	const component = ComponentFactory.get<IOrganizationComponent>(componentName);
	await component.addAdmin(request.pathParams.id, request.pathParams.accountId);

	return {
		statusCode: HttpStatusCode.noContent
	};
}

/**
 * Stop a member being an org admin of an organization.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function organizationAdminRemove(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IOrganizationAdminRemoveRequest
): Promise<INoContentResponse> {
	Guards.object<IOrganizationAdminRemoveRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IOrganizationAdminRemoveRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);

	const component = ComponentFactory.get<IOrganizationComponent>(componentName);
	await component.removeAdmin(request.pathParams.id, request.pathParams.accountId);

	return {
		statusCode: HttpStatusCode.noContent
	};
}
