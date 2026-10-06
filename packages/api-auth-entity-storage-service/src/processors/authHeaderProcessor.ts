// Copyright 2024 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import {
	HttpContextIdKeys,
	HttpErrorHelper,
	type IBaseRoute,
	type IBaseRouteProcessor,
	type IHttpResponse,
	type IHttpServerRequest,
	type ITenantAdminComponent
} from "@twin.org/api-models";
import {
	ContextIdHelper,
	ContextIdKeys,
	ContextIdStore,
	type IContextIds
} from "@twin.org/context";
import {
	BaseError,
	Coerce,
	ComponentFactory,
	Converter,
	GeneralError,
	Is,
	LfuCache
} from "@twin.org/core";
import { Blake2b } from "@twin.org/crypto";
import {
	EntityStorageConnectorFactory,
	type IEntityStorageConnector
} from "@twin.org/entity-storage-models";
import { nameof } from "@twin.org/nameof";
import { VaultConnectorFactory, type IVaultConnector } from "@twin.org/vault-models";
import { CookieHelper, HeaderTypes, HttpStatusCode } from "@twin.org/web";
import type { AuthenticationUser } from "../entities/authenticationUser.js";
import type { IAuthHeaderProcessorConstructorOptions } from "../models/IAuthHeaderProcessorConstructorOptions.js";
import type { IAuthTokenContext } from "../models/IAuthTokenContext.js";
import { TokenHelper } from "../utils/tokenHelper.js";

/**
 * Handle a JWT token in the authorization header or cookies and validate it to populate request context identity.
 */
export class AuthHeaderProcessor implements IBaseRouteProcessor {
	/**
	 * The default name for the access token as a cookie.
	 * @internal
	 */
	public static readonly DEFAULT_COOKIE_NAME: string = "access_token";

	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<AuthHeaderProcessor>();

	/**
	 * The default time to keep a verified token in the cache.
	 * @internal
	 */
	private static readonly _DEFAULT_TOKEN_CACHE_TTL_MS: number = 30000;

	/**
	 * The vault for the keys.
	 * @internal
	 */
	private readonly _vaultConnector: IVaultConnector;

	/**
	 * The component to retrieve tenant information.
	 * @internal
	 */
	private readonly _tenantAdminComponent?: ITenantAdminComponent;

	/**
	 * The entity storage for users.
	 * @internal
	 */
	private readonly _userEntityStorage: IEntityStorageConnector<AuthenticationUser>;

	/**
	 * The name of the key to retrieve from the vault for signing JWT.
	 * @internal
	 */
	private readonly _signingKeyName: string;

	/**
	 * The name of the cookie to use for the token.
	 * @internal
	 */
	private readonly _cookieName: string;

	/**
	 * Include the stack with errors.
	 * @internal
	 */
	private readonly _includeErrorStack: boolean;

	/**
	 * The node identity.
	 * @internal
	 */
	private _nodeId?: string;

	/**
	 * The organization ID for the single-tenant node, cached at startup.
	 * @internal
	 */
	private _nodeOrganizationId?: string;

	/**
	 * The cache of contexts resolved from verified tokens, undefined when caching is disabled.
	 * @internal
	 */
	private readonly _tokenCache?: LfuCache<IAuthTokenContext>;

	/**
	 * How long a cached token context may live, counted from when it was resolved.
	 * @internal
	 */
	private readonly _tokenCacheTtlMs: number;

	/**
	 * Create a new instance of AuthHeaderProcessor.
	 * @param options Options for the processor.
	 */
	constructor(options?: IAuthHeaderProcessorConstructorOptions) {
		this._vaultConnector = VaultConnectorFactory.get(options?.vaultConnectorType ?? "vault");
		this._userEntityStorage = EntityStorageConnectorFactory.get(
			options?.userEntityStorageType ?? "authentication-user"
		);
		this._tenantAdminComponent = ComponentFactory.getIfExists<ITenantAdminComponent>(
			options?.tenantAdminComponentType ?? "tenant-admin"
		);

		this._signingKeyName = options?.config?.signingKeyName ?? "auth-signing";
		this._cookieName = options?.config?.cookieName ?? AuthHeaderProcessor.DEFAULT_COOKIE_NAME;
		this._includeErrorStack = options?.config?.includeErrorStack ?? false;

		this._tokenCacheTtlMs =
			options?.config?.tokenCacheTtlMs ?? AuthHeaderProcessor._DEFAULT_TOKEN_CACHE_TTL_MS;
		if (this._tokenCacheTtlMs > 0) {
			this._tokenCache = new LfuCache<IAuthTokenContext>({
				capacity: options?.config?.tokenCacheCapacity,
				ttiMs: this._tokenCacheTtlMs,
				mutexTimeoutMs: options?.config?.tokenCacheMutexTimeoutMs
			});
		}
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return AuthHeaderProcessor.CLASS_NAME;
	}

	/**
	 * The service needs to be started when the application is initialized.
	 * @param nodeLoggingComponentType The node logging component type.
	 * @returns A promise that resolves when the node identity and organization ID have been cached.
	 */
	public async start(nodeLoggingComponentType?: string): Promise<void> {
		const contextIds = await ContextIdStore.getContextIds();
		ContextIdHelper.guard(contextIds, ContextIdKeys.Node);
		this._nodeId = contextIds[ContextIdKeys.Node];
		this._nodeOrganizationId = contextIds[ContextIdKeys.Organization];
	}

	/**
	 * Stop the processor and release the token cache.
	 * @returns A promise that resolves when the processor has stopped.
	 */
	public async stop(): Promise<void> {
		this._tokenCache?.destroy();
	}

	/**
	 * Pre process the REST request for the specified route.
	 * @param request The incoming request.
	 * @param response The outgoing response.
	 * @param route The route to process.
	 * @param contextIds The context IDs of the request.
	 * @param processorState The state handed through the processors.
	 * @returns A promise that resolves when the JWT has been verified and the context populated, or an error response set.
	 */
	public async pre(
		request: IHttpServerRequest,
		response: IHttpResponse,
		route: IBaseRoute | undefined,
		contextIds: IContextIds,
		processorState: { [id: string]: unknown }
	): Promise<void> {
		if (!Is.empty(route) && !(route.skipAuth ?? false)) {
			try {
				if (!Is.stringValue(this._nodeId)) {
					throw new GeneralError(AuthHeaderProcessor.CLASS_NAME, "nodeIdNotSet");
				}

				const tokenAndLocation = TokenHelper.extractTokenFromHeaders(
					request.headers,
					this._cookieName
				);

				const tokenContext = await this.resolveTokenContext(
					this._nodeId,
					tokenAndLocation?.token,
					contextIds
				);

				contextIds[ContextIdKeys.Tenant] = tokenContext.tenantId;
				// In a multi-tenant environment the tenant organization ID is authoritative,
				// in a single-tenant environment we fall back to the node organization ID.
				contextIds[ContextIdKeys.Organization] =
					tokenContext.tenantOrganizationId ?? this._nodeOrganizationId;
				contextIds[ContextIdKeys.User] = tokenContext.userIdentity;
				contextIds[ContextIdKeys.UserOrganization] = tokenContext.userOrganization;

				// If the tenant has a custom public origin, we set it in the context for downstream processors to use.
				if (Is.stringValue(tokenContext.tenantPublicOrigin)) {
					contextIds[HttpContextIdKeys.PublicOrigin] = tokenContext.tenantPublicOrigin;
				}

				processorState.authToken = tokenAndLocation?.token;
				processorState.authTokenLocation = tokenAndLocation?.location;
			} catch (err) {
				const error = BaseError.fromError(err);
				HttpErrorHelper.buildResponse(
					response,
					error,
					HttpStatusCode.unauthorized,
					this._includeErrorStack
				);
			}
		}
	}

	/**
	 * Post process the REST request for the specified route.
	 * @param request The incoming request.
	 * @param response The outgoing response.
	 * @param route The route to process.
	 * @param contextIds The context IDs of the request.
	 * @param processorState The state handed through the processors.
	 * @returns A promise that resolves when the Set-Cookie header has been applied to the response if required.
	 */
	public async post(
		request: IHttpServerRequest,
		response: IHttpResponse,
		route: IBaseRoute | undefined,
		contextIds: IContextIds,
		processorState: { [id: string]: unknown }
	): Promise<void> {
		const responseAuthOperation = processorState?.authOperation;
		const responseAuthToken = processorState?.authToken;

		// We don't populate the cookie if the incoming request was from an authorization header.
		if (
			!Is.empty(route) &&
			Is.stringValue(responseAuthOperation) &&
			processorState.authTokenLocation !== "authorization"
		) {
			if (
				(responseAuthOperation === "login" || responseAuthOperation === "refresh") &&
				Is.stringValue(responseAuthToken)
			) {
				response.headers ??= {};
				response.headers[HeaderTypes.SetCookie] = CookieHelper.createCookie(
					this._cookieName,
					responseAuthToken,
					{
						secure: true,
						httpOnly: true,
						sameSite: "None",
						path: "/"
					}
				);
			} else if (responseAuthOperation === "logout") {
				response.headers ??= {};
				response.headers[HeaderTypes.SetCookie] = CookieHelper.deleteCookie(this._cookieName, {
					secure: true,
					httpOnly: true,
					sameSite: "None",
					path: "/"
				});
			}
		}
	}

	/**
	 * Resolve the route independent context for a token, through the cache when one is enabled.
	 * @param nodeId The node identifier the token must have been issued by.
	 * @param token The token from the request, if there was one.
	 * @param contextIds The context IDs of the request.
	 * @returns The resolved context.
	 * @internal
	 */
	private async resolveTokenContext(
		nodeId: string,
		token: string | undefined,
		contextIds: IContextIds
	): Promise<IAuthTokenContext> {
		if (Is.empty(this._tokenCache) || !Is.stringValue(token)) {
			return this.verifyToken(nodeId, token, contextIds);
		}

		// Use hash of token so we don't store the raw token in memory.
		const cacheKey = Converter.bytesToHex(Blake2b.sum256(Converter.utf8ToBytes(token)));

		const tokenContext = await this._tokenCache.getOrSet(
			cacheKey,
			async () => this.verifyToken(nodeId, token, contextIds),
			Date.now() + this._tokenCacheTtlMs
		);

		// A token can expire while its context sits in the cache.
		if (Is.integer(tokenContext.expires) && tokenContext.expires <= Date.now()) {
			this._tokenCache.delete(cacheKey);
			return this.verifyToken(nodeId, token, contextIds);
		}

		return tokenContext;
	}

	/**
	 * Verify a token against the vault and resolve the tenant and user it refers to.
	 * @param nodeId The node identifier the token must have been issued by.
	 * @param token The token from the request, if there was one.
	 * @param contextIds The context IDs of the request.
	 * @returns The resolved context.
	 * @internal
	 */
	private async verifyToken(
		nodeId: string,
		token: string | undefined,
		contextIds: IContextIds
	): Promise<IAuthTokenContext> {
		let user: AuthenticationUser | undefined;
		let tenantId: string | undefined;
		let tenantOrganizationId: string | undefined;
		let tenantPublicOrigin: string | undefined;

		const { payload } = await TokenHelper.verify(
			this._vaultConnector,
			nodeId,
			this._signingKeyName,
			token,
			async (
				sub: string,
				org: string,
				tid: string | undefined,
				passwordVersion: number | undefined
			) => {
				const validParts = [];

				tenantId = tid;

				if (Is.stringValue(tenantId)) {
					const tenant = await this._tenantAdminComponent?.get(tenantId);
					if (tenant?.id === tenantId) {
						validParts.push("tenant");
						tenantOrganizationId = tenant.organizationId;
						tenantPublicOrigin = tenant.publicOrigin;
					}
				}

				// We use the tenant id from the token, if the user is not in that
				// partition then the get will fail
				const contextIdsForUserLookup = {
					...contextIds,
					[ContextIdKeys.Tenant]: tid
				};

				// Wrap the user lookup in the request context so partitioned storage uses the correct tenant.
				user = await ContextIdStore.run(contextIdsForUserLookup, async () =>
					this._userEntityStorage.get(sub, "identity")
				);

				if (user?.identity === sub && (passwordVersion ?? 0) === (user.passwordVersion ?? 0)) {
					validParts.push("user");
				}
				if (user?.organization === org) {
					validParts.push("organization");
				}

				return validParts;
			}
		);

		const expiresSeconds = Coerce.integer(payload.exp);

		return {
			tenantId,
			tenantOrganizationId,
			tenantPublicOrigin,
			userIdentity: user?.identity,
			userOrganization: user?.organization,
			expires: Is.integer(expiresSeconds) ? expiresSeconds * 1000 : undefined
		};
	}
}
