// Copyright 2024 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type {
	IAuthenticationComponent,
	ILoginRequest,
	ILoginResponse,
	ILoginWithProviderRequest,
	ILogoutRequest,
	IMeResponse,
	IPasswordForgotRequest,
	IPasswordPolicyResponse,
	IPasswordResetRequest,
	IProvidersResponse,
	IRefreshTokenRequest,
	IRefreshTokenResponse,
	IRegisterAcceptedResponse,
	IRegisterRequest,
	IRegisterVerifyRequest,
	IUpdatePasswordRequest,
	IUpdatePasswordResponse
} from "@3sixty/api-auth-entity-storage-models";
import type {
	IAcceptedResponse,
	IConflictResponse,
	IForbiddenResponse,
	IHttpRequestContext,
	INoContentRequest,
	INoContentResponse,
	INotFoundResponse,
	IRestRoute,
	IRestRouteResponseOptions,
	ITag,
	ITooManyRequestsResponse,
	IUnauthorizedResponse
} from "@3sixty/api-models";
import { Coerce, ComponentFactory, Guards, Is } from "@3sixty/core";
import { nameof } from "@3sixty/nameof";
import { HttpStatusCode } from "@3sixty/web";

/**
 * The source used when communicating about these routes.
 */
const ROUTES_SOURCE = "authenticationRoutes";

/**
 * The tag to associate with the routes.
 */
export const tagsAuthentication: ITag[] = [
	{
		name: "Authentication",
		description: "Authentication endpoints for the REST server."
	}
];

/**
 * The REST routes for authentication.
 * @param baseRouteName Prefix to prepend to the paths.
 * @param componentName The name of the component to use in the routes stored in the ComponentFactory.
 * @returns The generated routes.
 */
export function generateRestRoutesAuthentication(
	baseRouteName: string,
	componentName: string
): IRestRoute[] {
	const loginRoute: IRestRoute<ILoginRequest, ILoginResponse> = {
		operationId: "authenticationLogin",
		summary: "Login to the server",
		tag: tagsAuthentication[0].name,
		method: "POST",
		path: `${baseRouteName}/login`,
		handler: async (httpRequestContext, request) =>
			authenticationLogin(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<ILoginRequest>(),
			examples: [
				{
					id: "loginRequestExample",
					description: "The request to login to the server.",
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
				type: nameof<ILoginResponse>(),
				examples: [
					{
						id: "loginResponseExample",
						description: "The response for the login request.",
						response: {
							body: {
								accountId: "01a17afb-e05f-7939-83f2-d4f04c4bdf2e",
								expiry: 1722514341067
							}
						}
					}
				]
			},
			{
				type: nameof<IUnauthorizedResponse>()
			}
		],
		skipAuth: true
	};

	const loginWithProviderRoute: IRestRoute<ILoginWithProviderRequest, ILoginResponse> = {
		operationId: "authenticationLoginWithProvider",
		summary: "Login to the server through an authentication provider",
		tag: tagsAuthentication[0].name,
		method: "POST",
		path: `${baseRouteName}/login/:authProviderId`,
		handler: async (httpRequestContext, request) =>
			authenticationLoginWithProvider(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<ILoginWithProviderRequest>(),
			examples: [
				{
					id: "loginWithProviderRequestExample",
					description: "The request to login through an authentication provider.",
					request: {
						pathParams: {
							authProviderId: "google"
						},
						body: {
							code: "4/0AbCdEf",
							codeVerifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
							redirectUri: "https://example.com/authentication/oauth/google/callback",
							nonce: "n-0S6_WzA2Mj"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<ILoginResponse>()
			},
			{
				type: nameof<IUnauthorizedResponse>()
			}
		],
		skipAuth: true
	};

	const registerRoute: IRestRoute<IRegisterRequest, ILoginResponse | IRegisterAcceptedResponse> = {
		operationId: "authenticationRegister",
		summary:
			"Sign up for a password account when self sign up is enabled, accepted whether or not the address is taken when the e-mail address must be verified, otherwise signed in",
		tag: tagsAuthentication[0].name,
		method: "POST",
		path: `${baseRouteName}/register`,
		handler: async (httpRequestContext, request) =>
			authenticationRegister(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IRegisterRequest>(),
			examples: [
				{
					id: "registerRequestExample",
					description: "The request to sign up for a password account.",
					request: {
						body: {
							email: "user@example.com",
							password: "MyPassword123!",
							givenName: "Jane",
							familyName: "Doe"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<ILoginResponse>(),
				examples: [
					{
						id: "registerResponseExample",
						description: "The response for the sign up request.",
						response: {
							body: {
								accountId: "01a17afb-e05f-7939-83f2-d4f04c4bdf2e",
								expiry: 1722514341067,
								profileReadOnly: false
							}
						}
					}
				]
			},
			{
				// Documented as accepted, the response has no body or location.
				type: nameof<IAcceptedResponse>()
			},
			{
				type: nameof<IConflictResponse>()
			},
			{
				type: nameof<ITooManyRequestsResponse>()
			}
		],
		skipAuth: true
	};

	const registerVerifyRoute: IRestRoute<IRegisterVerifyRequest, INoContentResponse> = {
		operationId: "authenticationRegisterVerify",
		summary: "Verify the e-mail address of a sign up with the token from the verification link",
		tag: tagsAuthentication[0].name,
		method: "POST",
		path: `${baseRouteName}/register/verify`,
		handler: async (httpRequestContext, request) =>
			authenticationRegisterVerify(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IRegisterVerifyRequest>(),
			examples: [
				{
					id: "registerVerifyRequestExample",
					description: "The request to verify a sign up.",
					request: {
						body: {
							token: "3q2-7wYc0Q1h4k9pXg2rT8vN5mL6bJ1aZ0yW4uE7sD8"
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
				type: nameof<ITooManyRequestsResponse>()
			}
		],
		skipAuth: true
	};

	const meRoute: IRestRoute<INoContentRequest, IMeResponse> = {
		operationId: "authenticationMe",
		summary: "Get the signed in account",
		tag: tagsAuthentication[0].name,
		method: "GET",
		path: `${baseRouteName}/me`,
		handler: async (httpRequestContext, request) =>
			authenticationMe(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<INoContentRequest>()
		},
		responseType: [
			{
				type: nameof<IMeResponse>(),
				examples: [
					{
						id: "meResponseExample",
						description: "The signed in account.",
						response: {
							body: {
								accountId: "01a17afb-e05f-7939-83f2-d4f04c4bdf2e",
								email: "user@example.com",
								authProviderId: "google",
								profileReadOnly: true,
								profileEditUrl: "https://myaccount.google.com/personal-info",
								passwordChangeUrl: "https://myaccount.google.com/signinoptions/password",
								identity: "did:example:123456789abcdefghi",
								organization: "did:example:organization"
							}
						}
					}
				]
			},
			{
				type: nameof<IUnauthorizedResponse>()
			},
			{
				type: nameof<INotFoundResponse>()
			}
		],
		requiresAuthorization: false
	};

	const removeAccountRoute: IRestRoute<INoContentRequest, INoContentResponse> = {
		operationId: "authenticationRemoveAccount",
		summary: "Remove the signed in account with its identity and sign out, needs a recent sign in",
		tag: tagsAuthentication[0].name,
		method: "DELETE",
		path: `${baseRouteName}/me`,
		handler: async (httpRequestContext, request) =>
			authenticationRemoveAccount(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<INoContentRequest>()
		},
		responseType: [
			{
				type: nameof<INoContentResponse>()
			},
			{
				type: nameof<IUnauthorizedResponse>()
			},
			{
				type: nameof<INotFoundResponse>()
			}
		],
		requiresAuthorization: false
	};

	const logoutRoute: IRestRoute<ILogoutRequest, INoContentResponse> = {
		operationId: "authenticationLogout",
		summary: "Logout from the server",
		tag: tagsAuthentication[0].name,
		method: "POST",
		path: `${baseRouteName}/logout`,
		handler: async (httpRequestContext, request) =>
			authenticationLogout(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<ILogoutRequest>(),
			examples: [
				{
					id: "logoutRequestExample",
					description: "The request to logout from the server.",
					request: {
						body: {
							token: "eyJhbGciOiJIU...sw5c"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<INoContentResponse>()
			}
		]
	};

	const refreshTokenRoute: IRestRoute<IRefreshTokenRequest, IRefreshTokenResponse> = {
		operationId: "authenticationRefreshToken",
		summary: "Refresh an authentication token",
		tag: tagsAuthentication[0].name,
		method: "POST",
		path: `${baseRouteName}/refresh`,
		handler: async (httpRequestContext, request) =>
			authenticationRefreshToken(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IRefreshTokenRequest>(),
			examples: [
				{
					id: "refreshTokenRequestExample",
					description: "The request to refresh an auth token.",
					request: {
						body: {
							token: "eyJhbGciOiJIU...sw5c"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IRefreshTokenResponse>(),
				examples: [
					{
						id: "refreshTokenResponseExample",
						description: "The response for the refresh token request.",
						response: {
							body: {
								expiry: 1722514341067
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

	const updatePasswordRoute: IRestRoute<IUpdatePasswordRequest, IUpdatePasswordResponse> = {
		operationId: "authenticationUpdatePassword",
		summary:
			"Update the current user's password, ending the other sessions and returning a new token for the current one",
		tag: tagsAuthentication[0].name,
		method: "PUT",
		path: `${baseRouteName}/password`,
		handler: async (httpRequestContext, request) =>
			authenticationUpdatePassword(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IUpdatePasswordRequest>(),
			examples: [
				{
					id: "updatePasswordRequestExample",
					description: "The request to update the current user's password.",
					request: {
						body: {
							currentPassword: "MyNewPassword123!",
							newPassword: "MyNewPassword123!"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IUpdatePasswordResponse>(),
				examples: [
					{
						id: "updatePasswordResponseExample",
						description: "The response for the update password request.",
						response: {
							body: {
								token: "eyJhbGciOiJIU...sw5c",
								expiry: 1722514341067
							}
						}
					}
				]
			},
			{
				type: nameof<IUnauthorizedResponse>()
			},
			{
				type: nameof<IForbiddenResponse>()
			},
			{
				type: nameof<ITooManyRequestsResponse>()
			}
		],
		requiresAuthorization: false
	};

	const passwordForgotRoute: IRestRoute<IPasswordForgotRequest, INoContentResponse> = {
		operationId: "authenticationPasswordForgot",
		summary:
			"Send a link to reset a forgotten password, the response is the same whether or not the account exists",
		tag: tagsAuthentication[0].name,
		method: "POST",
		path: `${baseRouteName}/password/forgot`,
		handler: async (httpRequestContext, request) =>
			authenticationPasswordForgot(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IPasswordForgotRequest>(),
			examples: [
				{
					id: "passwordForgotRequestExample",
					description: "The request for a link to reset a forgotten password.",
					request: {
						body: {
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
				type: nameof<ITooManyRequestsResponse>()
			}
		],
		skipAuth: true
	};

	const passwordResetRoute: IRestRoute<IPasswordResetRequest, INoContentResponse> = {
		operationId: "authenticationPasswordReset",
		summary: "Reset a forgotten password with the token from the reset link",
		tag: tagsAuthentication[0].name,
		method: "POST",
		path: `${baseRouteName}/password/reset`,
		handler: async (httpRequestContext, request) =>
			authenticationPasswordReset(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<IPasswordResetRequest>(),
			examples: [
				{
					id: "passwordResetRequestExample",
					description: "The request to reset a forgotten password.",
					request: {
						body: {
							token: "3q2-7wYc0Q1h4k9pXg2rT8vN5mL6bJ1aZ0yW4uE7sD8",
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
				type: nameof<ITooManyRequestsResponse>()
			}
		],
		skipAuth: true
	};

	const passwordPolicyRoute: IRestRoute<INoContentRequest, IPasswordPolicyResponse> = {
		operationId: "authenticationPasswordPolicy",
		summary: "Get the password policy",
		tag: tagsAuthentication[0].name,
		method: "GET",
		path: `${baseRouteName}/policy`,
		handler: async (httpRequestContext, request) =>
			authenticationPasswordPolicy(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<INoContentRequest>()
		},
		responseType: [
			{
				type: nameof<IPasswordPolicyResponse>(),
				examples: [
					{
						id: "passwordPolicyResponseExample",
						description: "The response for the password policy request.",
						response: {
							body: {
								minPasswordLength: 15,
								maxPasswordLength: 128
							}
						}
					}
				]
			}
		],
		skipAuth: true,
		skipTenant: true
	};

	const providersRoute: IRestRoute<INoContentRequest, IProvidersResponse> = {
		operationId: "authenticationProviders",
		summary: "Get the enabled authentication providers",
		tag: tagsAuthentication[0].name,
		method: "GET",
		path: `${baseRouteName}/providers`,
		handler: async (httpRequestContext, request) =>
			authenticationProviders(httpRequestContext, componentName, request),
		requestType: {
			type: nameof<INoContentRequest>()
		},
		responseType: [
			{
				type: nameof<IProvidersResponse>(),
				examples: [
					{
						id: "providersResponseExample",
						description: "The response for the providers request.",
						response: {
							body: {
								providers: [
									{
										authProviderId: "entity-storage",
										signInMethod: "password",
										passwordChange: "api",
										profileReadOnly: false
									},
									{
										authProviderId: "google",
										signInMethod: "redirect",
										passwordChange: "external",
										passwordChangeUrl: "https://myaccount.google.com/signinoptions/password",
										profileReadOnly: true,
										profileEditUrl: "https://myaccount.google.com/personal-info"
									}
								]
							}
						}
					}
				]
			}
		],
		skipAuth: true,
		skipTenant: true
	};

	return [
		loginRoute,
		loginWithProviderRoute,
		registerRoute,
		registerVerifyRoute,
		meRoute,
		removeAccountRoute,
		logoutRoute,
		refreshTokenRoute,
		updatePasswordRoute,
		passwordForgotRoute,
		passwordResetRoute,
		passwordPolicyRoute,
		providersRoute
	];
}

/**
 * Login to the server.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function authenticationLogin(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: ILoginRequest
): Promise<ILoginResponse & IRestRouteResponseOptions> {
	Guards.object<ILoginRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<ILoginRequest["body"]>(ROUTES_SOURCE, nameof(request.body), request.body);

	const component = ComponentFactory.get<IAuthenticationComponent>(componentName);
	const result = await component.login(request.body.email, request.body.password);

	// Need to give a hint to any auth processors about the operation
	// in case they need to manipulate the response
	httpRequestContext.processorState.authOperation = "login";
	httpRequestContext.processorState.authToken = result.token;

	return {
		body: {
			accountId: result.accountId,
			expiry: result.expiry,
			profile: result.profile,
			profileReadOnly: result.profileReadOnly,
			profileEditUrl: result.profileEditUrl,
			passwordChangeUrl: result.passwordChangeUrl
		}
	};
}

/**
 * Login to the server through an authentication provider.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function authenticationLoginWithProvider(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: ILoginWithProviderRequest
): Promise<ILoginResponse & IRestRouteResponseOptions> {
	Guards.object<ILoginWithProviderRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<ILoginWithProviderRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);
	Guards.object<ILoginWithProviderRequest["body"]>(
		ROUTES_SOURCE,
		nameof(request.body),
		request.body
	);
	// The nonce binds the ID token to a sign in started by the caller.
	Guards.stringValue(ROUTES_SOURCE, nameof(request.body.nonce), request.body.nonce);

	const component = ComponentFactory.get<IAuthenticationComponent>(componentName);
	const result = await component.loginWithProvider(request.pathParams.authProviderId, request.body);

	// Need to give a hint to any auth processors about the operation
	// in case they need to manipulate the response
	httpRequestContext.processorState.authOperation = "login";
	httpRequestContext.processorState.authToken = result.token;

	return {
		body: {
			accountId: result.accountId,
			expiry: result.expiry,
			profile: result.profile,
			profileReadOnly: result.profileReadOnly,
			profileEditUrl: result.profileEditUrl,
			passwordChangeUrl: result.passwordChangeUrl
		}
	};
}

/**
 * Sign up for a password account, accepted when the e-mail address must be verified, otherwise
 * signed in.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function authenticationRegister(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IRegisterRequest
): Promise<(ILoginResponse | IRegisterAcceptedResponse) & IRestRouteResponseOptions> {
	Guards.object<IRegisterRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IRegisterRequest["body"]>(ROUTES_SOURCE, nameof(request.body), request.body);

	const component = ComponentFactory.get<IAuthenticationComponent>(componentName);
	const result = await component.register(request.body);
	if (Is.undefined(result)) {
		return {
			statusCode: HttpStatusCode.accepted
		};
	}

	// Need to give a hint to any auth processors about the operation
	// in case they need to manipulate the response
	httpRequestContext.processorState.authOperation = "login";
	httpRequestContext.processorState.authToken = result.token;

	return {
		body: {
			accountId: result.accountId,
			expiry: result.expiry,
			profile: result.profile,
			profileReadOnly: result.profileReadOnly,
			profileEditUrl: result.profileEditUrl,
			passwordChangeUrl: result.passwordChangeUrl
		}
	};
}

/**
 * Verify the e-mail address of a sign up.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function authenticationRegisterVerify(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IRegisterVerifyRequest
): Promise<INoContentResponse> {
	Guards.object<IRegisterVerifyRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IRegisterVerifyRequest["body"]>(ROUTES_SOURCE, nameof(request.body), request.body);

	const component = ComponentFactory.get<IAuthenticationComponent>(componentName);
	await component.verifyRegistration(request.body.token);

	return {
		statusCode: HttpStatusCode.noContent
	};
}

/**
 * Get the signed in account.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function authenticationMe(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: INoContentRequest
): Promise<IMeResponse> {
	const component = ComponentFactory.get<IAuthenticationComponent>(componentName);
	return {
		body: await component.me()
	};
}

/**
 * Remove the signed in account and sign out.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function authenticationRemoveAccount(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: INoContentRequest
): Promise<INoContentResponse & IRestRouteResponseOptions> {
	const component = ComponentFactory.get<IAuthenticationComponent>(componentName);
	await component.removeAccount(Coerce.integer(httpRequestContext.processorState.authSessionStart));

	// The auth processors remove the token cookie as on a logout.
	httpRequestContext.processorState.authOperation = "logout";

	return {
		statusCode: HttpStatusCode.noContent
	};
}

/**
 * Logout from the server.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function authenticationLogout(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: ILogoutRequest
): Promise<INoContentResponse & IRestRouteResponseOptions> {
	Guards.object<ILogoutRequest>(ROUTES_SOURCE, nameof(request), request);

	const component = ComponentFactory.get<IAuthenticationComponent>(componentName);
	await component.logout(request.body?.token);

	// Need to give a hint to any auth processors about the operation
	// in case they need to manipulate the response
	httpRequestContext.processorState.authOperation = "logout";

	return {
		statusCode: HttpStatusCode.noContent
	};
}

/**
 * Refresh the login token.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function authenticationRefreshToken(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IRefreshTokenRequest
): Promise<IRefreshTokenResponse & IRestRouteResponseOptions> {
	Guards.object<IRefreshTokenRequest>(ROUTES_SOURCE, nameof(request), request);

	const component = ComponentFactory.get<IAuthenticationComponent>(componentName);

	// If the token is not in the body, then maybe an auth processor has extracted it
	// and stored it in the processor state
	const token = request.body?.token ?? (httpRequestContext.processorState.authToken as string);
	const result = await component.refresh(token);

	// Need to give a hint to any auth processors about the operation
	// in case they need to manipulate the response
	httpRequestContext.processorState.authOperation = "refresh";
	httpRequestContext.processorState.authToken = result.token;

	return {
		body: {
			expiry: result.expiry
		}
	};
}

/**
 * Update the user's password.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function authenticationUpdatePassword(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IUpdatePasswordRequest
): Promise<IUpdatePasswordResponse & IRestRouteResponseOptions> {
	Guards.object<IUpdatePasswordRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IUpdatePasswordRequest["body"]>(ROUTES_SOURCE, nameof(request.body), request.body);

	const component = ComponentFactory.get<IAuthenticationComponent>(componentName);

	const result = await component.updatePassword(
		request.body.currentPassword,
		request.body.newPassword,
		httpRequestContext.processorState.authToken as string | undefined,
		Coerce.integer(httpRequestContext.processorState.authSessionStart)
	);

	// The auth processors replace the cookie as on a refresh, so the current session continues.
	httpRequestContext.processorState.authOperation = "refresh";
	httpRequestContext.processorState.authToken = result.token;

	return {
		body: {
			// A cookie session keeps its token in the http only cookie.
			token:
				httpRequestContext.processorState.authTokenLocation === "cookie" ? undefined : result.token,
			expiry: result.expiry
		}
	};
}

/**
 * Send a link to reset a forgotten password.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function authenticationPasswordForgot(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IPasswordForgotRequest
): Promise<INoContentResponse> {
	Guards.object<IPasswordForgotRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IPasswordForgotRequest["body"]>(ROUTES_SOURCE, nameof(request.body), request.body);

	const component = ComponentFactory.get<IAuthenticationComponent>(componentName);
	await component.forgotPassword(request.body.email);

	return {
		statusCode: HttpStatusCode.noContent
	};
}

/**
 * Reset a forgotten password with the token from the reset link.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function authenticationPasswordReset(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IPasswordResetRequest
): Promise<INoContentResponse> {
	Guards.object<IPasswordResetRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IPasswordResetRequest["body"]>(ROUTES_SOURCE, nameof(request.body), request.body);

	const component = ComponentFactory.get<IAuthenticationComponent>(componentName);
	await component.resetPassword(request.body.token, request.body.newPassword);

	return {
		statusCode: HttpStatusCode.noContent
	};
}

/**
 * Get the password policy.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function authenticationPasswordPolicy(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: INoContentRequest
): Promise<IPasswordPolicyResponse & IRestRouteResponseOptions> {
	const component = ComponentFactory.get<IAuthenticationComponent>(componentName);
	const result = await component.passwordPolicy();

	return {
		body: result
	};
}

/**
 * Get the enabled authentication providers.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @returns The response object with additional http response properties.
 */
export async function authenticationProviders(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: INoContentRequest
): Promise<IProvidersResponse> {
	const component = ComponentFactory.get<IAuthenticationComponent>(componentName);
	const providers = await component.providers();

	return {
		body: {
			providers
		}
	};
}
