// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type {
	IOAuthCallbackRequest,
	IOAuthComponent,
	IOAuthRedirectResponse,
	IOAuthStartRequest
} from "@3sixty/api-auth-oauth-models";
import {
	HttpContextIdKeys,
	HttpUrlHelper,
	type IHttpRequestContext,
	type INotFoundResponse,
	type IRestRoute,
	type ITag
} from "@3sixty/api-models";
import { ContextIdStore } from "@3sixty/context";
import { ComponentFactory, GeneralError, Guards, Is, Url } from "@3sixty/core";
import { nameof } from "@3sixty/nameof";
import { CookieHelper, HeaderTypes, HttpStatusCode } from "@3sixty/web";

/**
 * The source used when communicating about these routes.
 */
const ROUTES_SOURCE = "oauthRoutes";

/**
 * The cookie that keeps a sign in between starting and the callback.
 */
export const OAUTH_TRANSACTION_COOKIE = "oauth_transaction";

/**
 * The tag to associate with the routes.
 */
export const tagsOAuth: ITag[] = [
	{
		name: "OAuth",
		description: "Endpoints to sign in through an OAuth authentication provider."
	}
];

/**
 * The REST routes for OAuth sign in.
 * @param baseRouteName Prefix to prepend to the paths.
 * @param componentName The name of the component to use in the routes stored in the ComponentFactory.
 * @returns The generated routes.
 */
export function generateRestRoutesOAuth(
	baseRouteName: string,
	componentName: string
): IRestRoute[] {
	const startRoute: IRestRoute<IOAuthStartRequest, IOAuthRedirectResponse> = {
		operationId: "oauthStart",
		summary: "Start a sign in with an authentication provider",
		tag: tagsOAuth[0].name,
		method: "GET",
		path: `${baseRouteName}/:authProviderId/start`,
		handler: async (httpRequestContext, request) =>
			oauthStart(httpRequestContext, componentName, request, baseRouteName),
		requestType: {
			type: nameof<IOAuthStartRequest>(),
			examples: [
				{
					id: "oauthStartRequestExample",
					description: "The request to start a sign in with Google.",
					request: {
						pathParams: {
							authProviderId: "google"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IOAuthRedirectResponse>()
			},
			{
				type: nameof<INotFoundResponse>()
			}
		],
		skipAuth: true
	};

	const callbackRoute: IRestRoute<IOAuthCallbackRequest, IOAuthRedirectResponse> = {
		operationId: "oauthCallback",
		summary: "Complete a sign in when the authentication provider sends the browser back",
		tag: tagsOAuth[0].name,
		method: "GET",
		path: `${baseRouteName}/:authProviderId/callback`,
		handler: async (httpRequestContext, request) =>
			oauthCallback(httpRequestContext, componentName, request, baseRouteName),
		requestType: {
			type: nameof<IOAuthCallbackRequest>(),
			examples: [
				{
					id: "oauthCallbackRequestExample",
					description: "The browser returning from Google.",
					request: {
						pathParams: {
							authProviderId: "google"
						},
						query: {
							code: "4/0AbCdEf",
							state: "3c9e1b7a5d2f"
						}
					}
				}
			]
		},
		responseType: [
			{
				type: nameof<IOAuthRedirectResponse>()
			}
		],
		skipAuth: true
	};

	return [startRoute, callbackRoute];
}

/**
 * Start a sign in with an authentication provider.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @param baseRouteName The base route name, used to build the callback address.
 * @returns A redirect to the provider, keeping the sign in in a cookie.
 */
export async function oauthStart(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IOAuthStartRequest,
	baseRouteName: string
): Promise<IOAuthRedirectResponse> {
	Guards.object<IOAuthStartRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IOAuthStartRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);

	const { authProviderId } = request.pathParams;
	const component = ComponentFactory.get<IOAuthComponent>(componentName);
	const result = await component.beginSignIn(
		authProviderId,
		await callbackUrl(baseRouteName, authProviderId)
	);

	return {
		statusCode: HttpStatusCode.found,
		headers: {
			[HeaderTypes.Location]: result.location,
			[HeaderTypes.SetCookie]: CookieHelper.createCookie(
				OAUTH_TRANSACTION_COOKIE,
				result.transaction,
				{
					secure: true,
					httpOnly: true,
					sameSite: "Lax",
					path: "/"
				}
			)
		}
	};
}

/**
 * Complete a sign in when the authentication provider sends the browser back.
 * @param httpRequestContext The request context for the API.
 * @param componentName The name of the component to use in the routes.
 * @param request The request.
 * @param baseRouteName The base route name, used to build the callback address.
 * @returns A redirect to the success or failure address.
 */
export async function oauthCallback(
	httpRequestContext: IHttpRequestContext,
	componentName: string,
	request: IOAuthCallbackRequest,
	baseRouteName: string
): Promise<IOAuthRedirectResponse> {
	Guards.object<IOAuthCallbackRequest>(ROUTES_SOURCE, nameof(request), request);
	Guards.object<IOAuthCallbackRequest["pathParams"]>(
		ROUTES_SOURCE,
		nameof(request.pathParams),
		request.pathParams
	);

	const { authProviderId } = request.pathParams;
	const transaction = CookieHelper.getCookieFromHeaders(
		httpRequestContext.serverRequest.headers?.[HeaderTypes.Cookie],
		OAUTH_TRANSACTION_COOKIE
	);

	const component = ComponentFactory.get<IOAuthComponent>(componentName);
	const result = await component.completeSignIn(
		authProviderId,
		await callbackUrl(baseRouteName, authProviderId),
		request.query ?? {},
		transaction
	);

	if (Is.stringValue(result.login?.token)) {
		// The auth processor sets the session cookie for a login, which replaces the transaction cookie.
		httpRequestContext.processorState.authOperation = "login";
		httpRequestContext.processorState.authToken = result.login.token;
	}

	return {
		statusCode: HttpStatusCode.found,
		headers: {
			[HeaderTypes.Location]: result.location,
			[HeaderTypes.SetCookie]: CookieHelper.deleteCookie(OAUTH_TRANSACTION_COOKIE, {
				secure: true,
				httpOnly: true,
				sameSite: "Lax",
				path: "/"
			})
		}
	};
}

/**
 * Build the callback address registered with the provider.
 * @param baseRouteName The base route name.
 * @param authProviderId The authentication provider id.
 * @returns The callback address.
 * @throws GeneralError when the request has no public origin.
 */
async function callbackUrl(baseRouteName: string, authProviderId: string): Promise<string> {
	const contextIds = await ContextIdStore.getContextIds();
	const url = HttpUrlHelper.combineOriginPath(
		contextIds?.[HttpContextIdKeys.PublicOrigin],
		`${baseRouteName}/${encodeURIComponent(authProviderId)}/callback`
	);
	if (!Is.stringValue(url) || Is.empty(Url.tryParseExact(url))) {
		throw new GeneralError("oauthRoutes", "publicOriginMissing");
	}
	return url;
}
