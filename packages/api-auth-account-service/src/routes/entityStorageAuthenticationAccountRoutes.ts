// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import {
	ExportFileHelper,
	ExportFileType,
	type IAccountDataCreateRequest,
	type IAccountDataGetRequest,
	type IAccountDataGetResponse,
	type IAccountDataQueryRequest,
	type IAccountDataQueryResponse,
	type IAccountDataRemoveRequest,
	type IAccountDataUpdateRequest,
	type IAccountIdentityAdoptRequest,
	type IAccountIdentityAdoptResponse,
	type IAccountIdentityExportResponse,
	type IAccountIdentityImportRequest,
	type IAccountIdentityImportResponse,
	type IAccountOrganizationCreateRequest,
	type IAccountOrganizationCreateResponse,
	type IAccountOrganizationGetResponse,
	type IAccountOrganizationJoinRequest,
	type IAccountOrganizationLeaveRequest,
	type IAccountOrganizationRequestGetResponse,
	type IAccountProfileExportResponse,
	type IAccountProfileImportRequest,
	type IAccountProfileImportResponse,
	type IAccountPublicAccountGetRequest,
	type IAccountPublicDataGetResponse,
	type IAccountPublicIdentityGetRequest,
	type IAuthenticationAccountComponent
} from "@3sixty/api-auth-models";
import {
	HttpContextIdKeys,
	HttpHeaderHelper,
	HttpUrlHelper,
	type IConflictResponse,
	type ICreatedResponse,
	type IForbiddenResponse,
	type IHttpRequestContext,
	type INoContentRequest,
	type INoContentResponse,
	type INotFoundResponse,
	type IRestRoute,
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
const ROUTES_SOURCE = "authenticationAccountRoutes";

/**
 * The cache control of the exports, which are never kept by a cache.
 */
const NO_STORE = "no-store";

/**
 * The tag to associate with the routes.
 */
export const tagsAuthenticationAccount: ITag[] = [
	{
		name: "Authentication Account",
		description: "Endpoints to manage the data stored for the signed in account."
	}
];

/**
 * The REST routes for the data of the signed in account.
 * @param baseRouteName Prefix to prepend to the paths.
 * @param componentName The name of the component to use in the routes stored in the ComponentFactory.
 * @returns The generated routes.
 */
export function generateRestRoutesAuthenticationAccount(
	baseRouteName: string,
	componentName: string
): IRestRoute[] {
	const adoptIdentityRoute: IRestRoute<
		IAccountIdentityAdoptRequest,
		IAccountIdentityAdoptResponse
	> = {
		operationId: "authenticationAccountAdoptIdentity",
		summary: "Adopt an identity for the signed in account, needs a recent sign in",
		tag: tagsAuthenticationAccount[0].name,
		method: "POST",
		path: `${baseRouteName}/identity`,
		handler: async (httpRequestContext, request) =>
			authenticationAccountAdoptIdentity(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAccountIdentityAdoptRequest>(),
			examples: [
				{
					id: "authenticationAccountCreateIdentityRequestExample",
					description: "The request to create a self-controlled DID for the account.",
					request: {
						body: {}
					}
				},
				{
					id: "authenticationAccountAdoptIdentityRequestExample",
					description: "The request to adopt a DID owned by the caller.",
					request: {
						body: {
							identity: "did:example:123456789abcdefghi",
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
				type: nameof<IAccountIdentityAdoptResponse>(),
				examples: [
					{
						id: "authenticationAccountAdoptIdentityResponseExample",
						description: "The identity of the account.",
						response: {
							body: {
								identity: "did:example:123456789abcdefghi"
							}
						}
					}
				]
			},
			{
				type: nameof<IConflictResponse>()
			},
			{
				type: nameof<IUnauthorizedResponse>()
			}
		],
		requiresAuthorization: false
	};

	const exportIdentityRoute: IRestRoute<INoContentRequest, IAccountIdentityExportResponse> = {
		operationId: "authenticationAccountExportIdentity",
		summary:
			"Export the identity of the signed in account with its private keys and credentials, needs a recent sign in",
		tag: tagsAuthenticationAccount[0].name,
		method: "POST",
		path: `${baseRouteName}/identity/export`,
		handler: async httpRequestContext =>
			authenticationAccountExportIdentity(httpRequestContext, componentName),
		responseType: [
			{
				type: nameof<IAccountIdentityExportResponse>(),
				examples: [
					{
						id: "authenticationAccountExportIdentityResponseExample",
						description: "The identity of the account, which holds private keys.",
						response: {
							headers: {
								[HeaderTypes.CacheControl]: NO_STORE
							},
							body: {
								type: ExportFileType.AccountIdentity,
								version: ExportFileHelper.VERSION,
								identity: {
									version: 1,
									namespace: "entity-storage",
									selfControlled: true,
									document: {
										"@context": "https://www.w3.org/ns/did/v1",
										id: "did:entity-storage:0x0123456789abcdef"
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
								credentials: [
									{
										"@context": ["https://www.w3.org/2018/credentials/v1", "https://schema.org"],
										type: ["VerifiableCredential", "OrganizationMembershipCredential"],
										credentialSubject: {
											"@type": "Person",
											id: "did:entity-storage:0x0123456789abcdef",
											memberOf: {
												"@type": "Organization",
												id: "did:entity-storage:0xfedcba9876543210"
											}
										},
										issuer: "did:entity-storage:0xfedcba9876543210",
										issuanceDate: "2026-01-12T09:05:23.123Z",
										credentialStatus: {
											id: "did:entity-storage:0xfedcba9876543210#revocation",
											type: "RevocationBitmap2022",
											revocationBitmapIndex: "5"
										},
										proof: {
											type: "DataIntegrityProof",
											cryptosuite: "eddsa-jcs-2022",
											created: "2026-01-12T09:05:23.123Z",
											verificationMethod:
												"did:entity-storage:0xfedcba9876543210#organization-assertion",
											proofPurpose: "assertionMethod",
											proofValue: "z58DAdFfa9SkqZMVPxAQp...jQCrfFPP2oumHKtz"
										}
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
				type: nameof<IUnprocessableEntityResponse>()
			},
			{
				type: nameof<ITooManyRequestsResponse>()
			},
			{
				type: nameof<IUnauthorizedResponse>()
			}
		],
		requiresAuthorization: false
	};

	const importIdentityRoute: IRestRoute<
		IAccountIdentityImportRequest,
		IAccountIdentityImportResponse
	> = {
		operationId: "authenticationAccountImportIdentity",
		summary:
			"Import an identity into the signed in account, instead of adopting one, needs a recent sign in",
		tag: tagsAuthenticationAccount[0].name,
		method: "POST",
		path: `${baseRouteName}/identity/import`,
		handler: async (httpRequestContext, request) =>
			authenticationAccountImportIdentity(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAccountIdentityImportRequest>(),
			examples: [
				{
					id: "authenticationAccountImportIdentityRequestExample",
					description: "The request to import an identity exported from an account.",
					request: {
						body: {
							type: ExportFileType.AccountIdentity,
							version: ExportFileHelper.VERSION,
							identity: {
								version: 1,
								namespace: "entity-storage",
								selfControlled: true,
								document: {
									"@context": "https://www.w3.org/ns/did/v1",
									id: "did:entity-storage:0x0123456789abcdef"
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
							credentials: [
								{
									"@context": ["https://www.w3.org/2018/credentials/v1", "https://schema.org"],
									type: ["VerifiableCredential", "OrganizationMembershipCredential"],
									credentialSubject: {
										"@type": "Person",
										id: "did:entity-storage:0x0123456789abcdef",
										memberOf: {
											"@type": "Organization",
											id: "did:entity-storage:0xfedcba9876543210"
										}
									},
									issuer: "did:entity-storage:0xfedcba9876543210",
									issuanceDate: "2026-01-12T09:05:23.123Z",
									credentialStatus: {
										id: "did:entity-storage:0xfedcba9876543210#revocation",
										type: "RevocationBitmap2022",
										revocationBitmapIndex: "5"
									},
									proof: {
										type: "DataIntegrityProof",
										cryptosuite: "eddsa-jcs-2022",
										created: "2026-01-12T09:05:23.123Z",
										verificationMethod:
											"did:entity-storage:0xfedcba9876543210#organization-assertion",
										proofPurpose: "assertionMethod",
										proofValue: "z58DAdFfa9SkqZMVPxAQp...jQCrfFPP2oumHKtz"
									}
								}
							]
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IAccountIdentityImportResponse>(),
				examples: [
					{
						id: "authenticationAccountImportIdentityResponseExample",
						description: "The identity of the account and what was imported.",
						response: {
							body: {
								identity: "did:entity-storage:0x0123456789abcdef",
								credentialsImported: 1,
								credentialsSkipped: 0,
								organizations: ["did:example:organization"]
							}
						}
					}
				]
			},
			{
				type: nameof<IConflictResponse>()
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
		requiresAuthorization: false
	};

	const removeIdentityRoute: IRestRoute<INoContentRequest, INoContentResponse> = {
		operationId: "authenticationAccountRemoveIdentity",
		summary:
			"Remove the identity of the signed in account with its credentials and organizations, needs a recent sign in",
		tag: tagsAuthenticationAccount[0].name,
		method: "DELETE",
		path: `${baseRouteName}/identity`,
		handler: async httpRequestContext =>
			authenticationAccountRemoveIdentity(httpRequestContext, componentName),
		responseType: [
			{
				type: nameof<INoContentResponse>()
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

	const leaveOrganizationRoute: IRestRoute<IAccountOrganizationLeaveRequest, INoContentResponse> = {
		operationId: "authenticationAccountLeaveOrganization",
		summary: "Leave an organization with the signed in account",
		tag: tagsAuthenticationAccount[0].name,
		method: "DELETE",
		path: `${baseRouteName}/organization/:organization`,
		handler: async (httpRequestContext, request) =>
			authenticationAccountLeaveOrganization(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAccountOrganizationLeaveRequest>(),
			examples: [
				{
					id: "authenticationAccountLeaveOrganizationRequestExample",
					description: "The request to leave an organization.",
					request: {
						pathParams: {
							organization: "did:example:organization"
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
				type: nameof<IUnauthorizedResponse>()
			}
		],
		requiresAuthorization: false
	};

	const exportProfileRoute: IRestRoute<INoContentRequest, IAccountProfileExportResponse> = {
		operationId: "authenticationAccountExportProfile",
		summary:
			"Export the account data of the signed in account, other than its identity, organizations and credentials",
		tag: tagsAuthenticationAccount[0].name,
		method: "GET",
		path: `${baseRouteName}/export`,
		handler: async httpRequestContext =>
			authenticationAccountExportProfile(httpRequestContext, componentName),
		responseType: [
			{
				type: nameof<IAccountProfileExportResponse>(),
				examples: [
					{
						id: "authenticationAccountExportProfileResponseExample",
						description: "The account data of the account.",
						response: {
							headers: {
								[HeaderTypes.CacheControl]: NO_STORE
							},
							body: {
								type: ExportFileType.AccountProfile,
								version: ExportFileHelper.VERSION,
								items: [
									{
										type: "profile",
										data: {
											"@context": "https://schema.org",
											"@type": "Person",
											name: "Alice"
										},
										isDefault: true,
										dateCreated: "2026-01-12T09:05:23.123Z"
									}
								]
							}
						}
					}
				]
			},
			{
				type: nameof<ITooManyRequestsResponse>()
			},
			{
				type: nameof<IUnauthorizedResponse>()
			}
		],
		requiresAuthorization: false
	};

	const importProfileRoute: IRestRoute<
		IAccountProfileImportRequest,
		IAccountProfileImportResponse
	> = {
		operationId: "authenticationAccountImportProfile",
		summary: "Replace the account data of the signed in account with an export",
		tag: tagsAuthenticationAccount[0].name,
		method: "POST",
		path: `${baseRouteName}/import`,
		handler: async (httpRequestContext, request) =>
			authenticationAccountImportProfile(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAccountProfileImportRequest>(),
			examples: [
				{
					id: "authenticationAccountImportProfileRequestExample",
					description: "The request to replace the account data with an export.",
					request: {
						body: {
							type: ExportFileType.AccountProfile,
							version: ExportFileHelper.VERSION,
							items: [
								{
									type: "profile",
									data: {
										"@context": "https://schema.org",
										"@type": "Person",
										name: "Alice"
									},
									isDefault: true
								}
							]
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IAccountProfileImportResponse>(),
				examples: [
					{
						id: "authenticationAccountImportProfileResponseExample",
						description: "What was imported and removed.",
						response: {
							body: {
								itemsImported: 1,
								itemsRemoved: 2,
								skippedTypes: []
							}
						}
					}
				]
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
		requiresAuthorization: false
	};

	const getOrganizationRoute: IRestRoute<INoContentRequest, IAccountOrganizationGetResponse> = {
		operationId: "authenticationAccountGetOrganization",
		summary: "Get the organization of the signed in account",
		tag: tagsAuthenticationAccount[0].name,
		method: "GET",
		path: `${baseRouteName}/organization`,
		handler: async httpRequestContext =>
			authenticationAccountGetOrganization(httpRequestContext, componentName),
		responseType: [
			{
				type: nameof<IAccountOrganizationGetResponse>(),
				examples: [
					{
						id: "authenticationAccountGetOrganizationResponseExample",
						description: "The organization of the account.",
						response: {
							body: {
								organization: "did:example:organization"
							}
						}
					}
				]
			},
			{
				type: nameof<IUnprocessableEntityResponse>()
			},
			{
				type: nameof<IUnauthorizedResponse>()
			}
		],
		requiresAuthorization: false
	};

	const getOrganizationRequestRoute: IRestRoute<
		INoContentRequest,
		IAccountOrganizationRequestGetResponse
	> = {
		operationId: "authenticationAccountGetOrganizationRequest",
		summary: "Get the status of the request of the signed in account to join an organization",
		tag: tagsAuthenticationAccount[0].name,
		method: "GET",
		path: `${baseRouteName}/organization/request`,
		handler: async httpRequestContext =>
			authenticationAccountGetOrganizationRequest(httpRequestContext, componentName),
		responseType: [
			{
				type: nameof<IAccountOrganizationRequestGetResponse>(),
				examples: [
					{
						id: "authenticationAccountGetOrganizationRequestResponseExample",
						description: "The rejected request of the account.",
						response: {
							body: {
								request: {
									id: "01a17afc-611a-7d5b-a898-e0e20088b36e",
									accountId: "01a17afb-e05f-7939-83f2-d4f04c4bdf2e",
									organization: "did:example:organization",
									status: "rejected",
									reason: "organizationRequest.reason.notAMember",
									dateCreated: "2026-01-12T09:05:23.123Z",
									dateModified: "2026-01-13T10:15:00.000Z"
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
		requiresAuthorization: false
	};

	const cancelOrganizationRequestRoute: IRestRoute<INoContentRequest, INoContentResponse> = {
		operationId: "authenticationAccountCancelOrganizationRequest",
		summary: "Cancel the pending request of the signed in account to join an organization",
		tag: tagsAuthenticationAccount[0].name,
		method: "DELETE",
		path: `${baseRouteName}/organization/request`,
		handler: async httpRequestContext =>
			authenticationAccountCancelOrganizationRequest(httpRequestContext, componentName),
		responseType: [
			{
				type: nameof<INoContentResponse>()
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

	const joinOrganizationRoute: IRestRoute<IAccountOrganizationJoinRequest, INoContentResponse> = {
		operationId: "authenticationAccountJoinOrganization",
		summary: "Ask to join an organization with the signed in account",
		tag: tagsAuthenticationAccount[0].name,
		method: "POST",
		path: `${baseRouteName}/organization`,
		handler: async (httpRequestContext, request) =>
			authenticationAccountJoinOrganization(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAccountOrganizationJoinRequest>(),
			examples: [
				{
					id: "authenticationAccountJoinOrganizationRequestExample",
					description: "The request to join an organization.",
					request: {
						body: {
							organization: "did:example:organization"
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
				type: nameof<IConflictResponse>()
			},
			{
				type: nameof<IUnprocessableEntityResponse>()
			},
			{
				type: nameof<IUnauthorizedResponse>()
			}
		],
		requiresAuthorization: false
	};

	const createOrganizationRoute: IRestRoute<
		IAccountOrganizationCreateRequest,
		IAccountOrganizationCreateResponse
	> = {
		operationId: "authenticationAccountCreateOrganization",
		summary:
			"Create an organization for the signed in account, which becomes its member and org admin",
		tag: tagsAuthenticationAccount[0].name,
		method: "POST",
		path: `${baseRouteName}/organization/create`,
		handler: async (httpRequestContext, request) =>
			authenticationAccountCreateOrganization(
				httpRequestContext,
				componentName,
				request,
				baseRouteName
			),
		requestType: {
			type: nameof<IAccountOrganizationCreateRequest>(),
			examples: [
				{
					id: "authenticationAccountCreateOrganizationRequestExample",
					description: "The request to create an organization whose name and logo are public.",
					request: {
						body: {
							profile: {
								"@context": "https://schema.org",
								"@type": "Organization",
								name: "Example Ltd",
								email: "office@example.com"
							},
							logo: {
								"@context": "https://schema.org",
								"@type": "ImageObject",
								encodingFormat: "image/png",
								contentUrl: "data:image/png;base64,iVBORw0KGgo="
							},
							publicData: ["profile.name", "logo"]
						}
					}
				},
				{
					id: "authenticationAccountCreateOrganizationFromImportRequestExample",
					description:
						"The request to create an organization from an identity export of another node, keeping its DID.",
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
				type: nameof<IAccountOrganizationCreateResponse>(),
				examples: [
					{
						id: "authenticationAccountCreateOrganizationResponseExample",
						description: "The organization created.",
						response: {
							statusCode: HttpStatusCode.created,
							headers: {
								location: "authentication/account/organization"
							},
							body: {
								id: "01a17afc-611a-7d5b-a898-e0e20088b36f",
								identity: "did:example:organization",
								profile: {
									"@context": "https://schema.org",
									"@type": "Organization",
									name: "Example Ltd",
									email: "office@example.com"
								},
								publicData: ["profile.name", "logo"],
								isAdmin: true,
								dateCreated: "2026-01-12T09:05:23.123Z",
								dateModified: "2026-01-12T09:05:23.123Z"
							}
						}
					}
				]
			},
			{
				type: nameof<IConflictResponse>()
			},
			{
				type: nameof<IUnprocessableEntityResponse>()
			},
			{
				type: nameof<IUnauthorizedResponse>()
			}
		],
		requiresAuthorization: false
	};

	const publicIdentityRoute: IRestRoute<
		IAccountPublicIdentityGetRequest,
		IAccountPublicDataGetResponse
	> = {
		operationId: "authenticationAccountPublicIdentity",
		summary: "Get the public data of the organization or account that holds a DID",
		tag: tagsAuthenticationAccount[0].name,
		method: "GET",
		path: `${baseRouteName}/public/identity/:identity`,
		handler: async (httpRequestContext, request) =>
			authenticationAccountPublicIdentity(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAccountPublicIdentityGetRequest>(),
			examples: [
				{
					id: "authenticationAccountPublicIdentityRequestExample",
					description: "The request to get the public data of an organization by its DID.",
					request: {
						pathParams: {
							identity: "did:example:organization"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IAccountPublicDataGetResponse>(),
				examples: [
					{
						id: "authenticationAccountPublicIdentityResponseExample",
						description: "The public data of the organization.",
						response: {
							body: [
								{
									"@context": "https://schema.org",
									"@type": "Organization",
									name: "Example Ltd",
									address: {
										"@type": "PostalAddress",
										addressLocality: "London"
									},
									identifier: "did:example:organization"
								}
							]
						}
					}
				]
			},
			{
				type: nameof<INotFoundResponse>()
			}
		],
		skipAuth: true
	};

	const publicAccountRoute: IRestRoute<
		IAccountPublicAccountGetRequest,
		IAccountPublicDataGetResponse
	> = {
		operationId: "authenticationAccountPublicAccount",
		summary: "Get the public data of an account or organization",
		tag: tagsAuthenticationAccount[0].name,
		method: "GET",
		path: `${baseRouteName}/public/account/:accountId`,
		handler: async (httpRequestContext, request) =>
			authenticationAccountPublicAccount(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAccountPublicAccountGetRequest>(),
			examples: [
				{
					id: "authenticationAccountPublicAccountRequestExample",
					description: "The request to get the public data of an account.",
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
				type: nameof<IAccountPublicDataGetResponse>()
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

	const createRoute: IRestRoute<IAccountDataCreateRequest, ICreatedResponse> = {
		operationId: "authenticationAccountCreate",
		summary: "Store an item of account data",
		tag: tagsAuthenticationAccount[0].name,
		method: "POST",
		path: `${baseRouteName}`,
		handler: async (httpRequestContext, request) =>
			authenticationAccountCreate(httpRequestContext, componentName, request, baseRouteName),
		requestType: {
			type: nameof<IAccountDataCreateRequest>(),
			examples: [
				{
					id: "authenticationAccountCreateRequestExample",
					description: "The request to store an item of account data.",
					request: {
						body: {
							type: "profile",
							data: {
								"@context": "https://schema.org",
								"@type": "Person",
								name: "Alice"
							}
						}
					}
				},
				{
					id: "authenticationAccountCreateAvatarRequestExample",
					description:
						"The request to store the avatar of the account, a JPEG of at most 256 KiB as a data URL.",
					request: {
						body: {
							type: "avatar",
							data: {
								"@context": "https://schema.org",
								"@type": "ImageObject",
								encodingFormat: "image/jpeg",
								contentUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2Q==",
								width: 512,
								height: 512
							},
							isDefault: true
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
				type: nameof<IForbiddenResponse>()
			},
			{
				type: nameof<IUnauthorizedResponse>()
			},
			{
				type: nameof<IUnprocessableEntityResponse>()
			}
		],
		requiresAuthorization: false
	};

	const getRoute: IRestRoute<IAccountDataGetRequest, IAccountDataGetResponse> = {
		operationId: "authenticationAccountGet",
		summary: "Get an item of account data",
		tag: tagsAuthenticationAccount[0].name,
		method: "GET",
		path: `${baseRouteName}/:id`,
		handler: async (httpRequestContext, request) =>
			authenticationAccountGet(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAccountDataGetRequest>(),
			examples: [
				{
					id: "authenticationAccountGetRequestExample",
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
						id: "authenticationAccountGetResponseExample",
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
		requiresAuthorization: false
	};

	const updateRoute: IRestRoute<IAccountDataUpdateRequest, INoContentResponse> = {
		operationId: "authenticationAccountUpdate",
		summary: "Replace the value of an item of account data",
		tag: tagsAuthenticationAccount[0].name,
		method: "PUT",
		path: `${baseRouteName}/:id`,
		handler: async (httpRequestContext, request) =>
			authenticationAccountUpdate(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAccountDataUpdateRequest>(),
			examples: [
				{
					id: "authenticationAccountUpdateRequestExample",
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
				type: nameof<IUnauthorizedResponse>()
			},
			{
				type: nameof<IUnprocessableEntityResponse>()
			}
		],
		requiresAuthorization: false
	};

	const removeRoute: IRestRoute<IAccountDataRemoveRequest, INoContentResponse> = {
		operationId: "authenticationAccountRemove",
		summary: "Remove an item of account data",
		tag: tagsAuthenticationAccount[0].name,
		method: "DELETE",
		path: `${baseRouteName}/:id`,
		handler: async (httpRequestContext, request) =>
			authenticationAccountRemove(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAccountDataRemoveRequest>(),
			examples: [
				{
					id: "authenticationAccountRemoveRequestExample",
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
				type: nameof<IUnauthorizedResponse>()
			}
		],
		requiresAuthorization: false
	};

	const queryRoute: IRestRoute<IAccountDataQueryRequest, IAccountDataQueryResponse> = {
		operationId: "authenticationAccountQuery",
		summary: "Query the items of account data",
		tag: tagsAuthenticationAccount[0].name,
		method: "GET",
		path: `${baseRouteName}`,
		handler: async (httpRequestContext, request) =>
			authenticationAccountQuery(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IAccountDataQueryRequest>(),
			examples: [
				{
					id: "authenticationAccountQueryRequestExample",
					description: "The request to query the verifiable credentials of an account.",
					request: {
						query: {
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
		requiresAuthorization: false
	};

	return [
		adoptIdentityRoute,
		exportIdentityRoute,
		importIdentityRoute,
		removeIdentityRoute,
		exportProfileRoute,
		importProfileRoute,
		getOrganizationRoute,
		getOrganizationRequestRoute,
		// Before leaving an organization, whose path would otherwise read request as the organization.
		cancelOrganizationRequestRoute,
		joinOrganizationRoute,
		createOrganizationRoute,
		leaveOrganizationRoute,
		// Before getting an item, whose path would otherwise read public as the id.
		publicIdentityRoute,
		publicAccountRoute,
		createRoute,
		getRoute,
		updateRoute,
		removeRoute,
		queryRoute
	];
}

/**
 * Adopt an identity for the signed in account, the session must have started recently.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function authenticationAccountAdoptIdentity(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAccountIdentityAdoptRequest
): Promise<IAccountIdentityAdoptResponse> {
	Guards.object<IAccountIdentityAdoptRequest>(ROUTES_SOURCE, nameof(request), request);
	// A JSON body is required, so a cross-site form post cannot adopt an identity.
	Guards.object<IAccountIdentityAdoptRequest["body"]>(
		ROUTES_SOURCE,
		nameof(request.body),
		request.body
	);

	const component = ComponentFactory.get<IAuthenticationAccountComponent>(componentName);
	const identity = await component.adoptIdentity(
		request.body.identity,
		request.body.proof,
		sessionStartOf(httpRequestContext)
	);

	return {
		body: {
			identity
		}
	};
}

/**
 * Export the identity of the signed in account, the session must have started recently.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @returns The response object with additional http response properties.
 */
export async function authenticationAccountExportIdentity(
	httpRequestContext: IHttpRequestContext,
	componentName: string
): Promise<IAccountIdentityExportResponse> {
	const component = ComponentFactory.get<IAuthenticationAccountComponent>(componentName);
	const exported = await component.exportIdentity(sessionStartOf(httpRequestContext));

	return {
		// The export holds private keys, so it is never kept by a cache.
		headers: {
			[HeaderTypes.CacheControl]: NO_STORE
		},
		body: exported
	};
}

/**
 * Import an identity into the signed in account, the session must have started recently.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function authenticationAccountImportIdentity(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAccountIdentityImportRequest
): Promise<IAccountIdentityImportResponse> {
	// A guard error only carries a value that is not an object, so never the keys of an export.
	Guards.object<IAccountIdentityImportRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAccountIdentityImportRequest["body"]>(
		ROUTES_SOURCE,
		nameof(request.body),
		request.body
	);

	const component = ComponentFactory.get<IAuthenticationAccountComponent>(componentName);
	return {
		body: await component.importIdentity(request.body, sessionStartOf(httpRequestContext))
	};
}

/**
 * Remove the identity of the signed in account, the session must have started recently.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @returns The response object with additional http response properties.
 */
export async function authenticationAccountRemoveIdentity(
	httpRequestContext: IHttpRequestContext,
	componentName: string
): Promise<INoContentResponse> {
	const component = ComponentFactory.get<IAuthenticationAccountComponent>(componentName);
	await component.removeIdentity(sessionStartOf(httpRequestContext));

	return {
		statusCode: HttpStatusCode.noContent
	};
}

/**
 * Leave an organization with the signed in account.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function authenticationAccountLeaveOrganization(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAccountOrganizationLeaveRequest
): Promise<INoContentResponse> {
	Guards.object<IAccountOrganizationLeaveRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAccountOrganizationLeaveRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);

	const component = ComponentFactory.get<IAuthenticationAccountComponent>(componentName);
	await component.leaveOrganization(request.pathParams.organization);

	return {
		statusCode: HttpStatusCode.noContent
	};
}

/**
 * Export the account data of the signed in account.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @returns The response object with additional http response properties.
 */
export async function authenticationAccountExportProfile(
	httpRequestContext: IHttpRequestContext,
	componentName: string
): Promise<IAccountProfileExportResponse> {
	const component = ComponentFactory.get<IAuthenticationAccountComponent>(componentName);
	const exported = await component.exportProfile();

	return {
		headers: {
			[HeaderTypes.CacheControl]: NO_STORE
		},
		body: exported
	};
}

/**
 * Replace the account data of the signed in account with an export.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function authenticationAccountImportProfile(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAccountProfileImportRequest
): Promise<IAccountProfileImportResponse> {
	Guards.object<IAccountProfileImportRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAccountProfileImportRequest["body"]>(
		ROUTES_SOURCE,
		nameof(request.body),
		request.body
	);

	const component = ComponentFactory.get<IAuthenticationAccountComponent>(componentName);
	return {
		body: await component.importProfile(request.body)
	};
}

/**
 * Get when the session of the request started, as set by the auth processor.
 * @param httpRequestContext The request context for the API.
 * @returns The session start in seconds, or undefined when unknown.
 */
function sessionStartOf(httpRequestContext: IHttpRequestContext): number | undefined {
	return Coerce.integer(httpRequestContext.processorState?.authSessionStart);
}

/**
 * Get the organization of the signed in account.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @returns The response object with additional http response properties.
 */
export async function authenticationAccountGetOrganization(
	httpRequestContext: IHttpRequestContext,
	componentName: string
): Promise<IAccountOrganizationGetResponse> {
	const component = ComponentFactory.get<IAuthenticationAccountComponent>(componentName);
	return {
		body: {
			organization: await component.getOrganization()
		}
	};
}

/**
 * Get the status of the request of the signed in account to join an organization.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @returns The response object with additional http response properties.
 */
export async function authenticationAccountGetOrganizationRequest(
	httpRequestContext: IHttpRequestContext,
	componentName: string
): Promise<IAccountOrganizationRequestGetResponse> {
	const component = ComponentFactory.get<IAuthenticationAccountComponent>(componentName);
	return {
		body: {
			request: await component.getOrganizationRequest()
		}
	};
}

/**
 * Cancel the pending request of the signed in account to join an organization.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @returns The response object with additional http response properties.
 */
export async function authenticationAccountCancelOrganizationRequest(
	httpRequestContext: IHttpRequestContext,
	componentName: string
): Promise<INoContentResponse> {
	const component = ComponentFactory.get<IAuthenticationAccountComponent>(componentName);
	await component.cancelOrganizationRequest();

	return {
		statusCode: HttpStatusCode.noContent
	};
}

/**
 * Ask to join an organization with the signed in account.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function authenticationAccountJoinOrganization(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAccountOrganizationJoinRequest
): Promise<INoContentResponse> {
	Guards.object<IAccountOrganizationJoinRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAccountOrganizationJoinRequest["body"]>(
		ROUTES_SOURCE,
		nameof(request.body),
		request.body
	);

	const component = ComponentFactory.get<IAuthenticationAccountComponent>(componentName);
	await component.joinOrganization(request.body.organization);

	return {
		statusCode: HttpStatusCode.noContent
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
export async function authenticationAccountCreate(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAccountDataCreateRequest,
	baseRouteName: string
): Promise<ICreatedResponse> {
	Guards.object<IAccountDataCreateRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAccountDataCreateRequest["body"]>(
		ROUTES_SOURCE,
		nameof(request.body),
		request.body
	);

	const component = ComponentFactory.get<IAuthenticationAccountComponent>(componentName);
	const id = await component.create(request.body.type, request.body.data, request.body.isDefault);

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
export async function authenticationAccountGet(
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

	const component = ComponentFactory.get<IAuthenticationAccountComponent>(componentName);
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
export async function authenticationAccountUpdate(
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

	const component = ComponentFactory.get<IAuthenticationAccountComponent>(componentName);
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
export async function authenticationAccountRemove(
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

	const component = ComponentFactory.get<IAuthenticationAccountComponent>(componentName);
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
export async function authenticationAccountQuery(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAccountDataQueryRequest
): Promise<IAccountDataQueryResponse> {
	Guards.object<IAccountDataQueryRequest>(ROUTES_SOURCE, nameof(request), request);

	const component = ComponentFactory.get<IAuthenticationAccountComponent>(componentName);
	const result = await component.query(
		request.query?.type,
		request.query?.cursor,
		Coerce.integer(request.query?.limit)
	);

	return {
		body: result
	};
}

/**
 * Create an organization for the signed in account.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @param baseRouteName The base route name to use for the location header.
 * @returns The response object with additional http response properties.
 */
export async function authenticationAccountCreateOrganization(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAccountOrganizationCreateRequest,
	baseRouteName: string
): Promise<IAccountOrganizationCreateResponse> {
	Guards.object<IAccountOrganizationCreateRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAccountOrganizationCreateRequest["body"]>(
		ROUTES_SOURCE,
		nameof(request.body),
		request.body
	);

	const component = ComponentFactory.get<IAuthenticationAccountComponent>(componentName);
	const organization = await component.createOrganization(request.body);

	const contextIds = await ContextIdStore.getContextIds();
	const path = `${baseRouteName}/organization`;
	return {
		statusCode: HttpStatusCode.created,
		headers: {
			location:
				HttpUrlHelper.combineOriginPath(contextIds?.[HttpContextIdKeys.PublicOrigin], path) ?? path
		},
		body: organization
	};
}

/**
 * Get the public data of the organization or account that holds a DID.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function authenticationAccountPublicIdentity(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAccountPublicIdentityGetRequest
): Promise<IAccountPublicDataGetResponse> {
	Guards.object<IAccountPublicIdentityGetRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAccountPublicIdentityGetRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);

	const component = ComponentFactory.get<IAuthenticationAccountComponent>(componentName);
	return {
		body: await component.getPublicDataByIdentity(request.pathParams.identity)
	};
}

/**
 * Get the public data of an account or organization.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function authenticationAccountPublicAccount(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IAccountPublicAccountGetRequest
): Promise<IAccountPublicDataGetResponse> {
	Guards.object<IAccountPublicAccountGetRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IAccountPublicAccountGetRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);

	const component = ComponentFactory.get<IAuthenticationAccountComponent>(componentName);
	return {
		body: await component.getPublicDataByAccount(request.pathParams.accountId)
	};
}
