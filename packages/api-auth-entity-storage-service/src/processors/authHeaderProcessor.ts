// Copyright 2024 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { AuthOperation } from "@3sixty/api-auth-entity-storage-models";
import {
	HttpContextIdKeys,
	HttpErrorHelper,
	type IBaseRoute,
	type IBaseRouteProcessor,
	type IHttpResponse,
	type IHttpServerRequest,
	type ITenantAdminComponent
} from "@3sixty/api-models";
import { ContextIdHelper, ContextIdKeys, ContextIdStore, type IContextIds } from "@3sixty/context";
import {
	BaseError,
	Coerce,
	ComponentFactory,
	Converter,
	DurationConstants,
	GeneralError,
	Guards,
	Is,
	LfuCache
} from "@3sixty/core";
import { Blake2b } from "@3sixty/crypto";
import {
	EntityStorageConnectorFactory,
	type IEntityStorageConnector
} from "@3sixty/entity-storage-models";
import { nameof } from "@3sixty/nameof";
import { VaultConnectorFactory, type IVaultConnector } from "@3sixty/vault-models";
import { CookieHelper, CookieSameSite, HeaderTypes, HttpStatusCode } from "@3sixty/web";
import type { AuthenticationUser } from "../entities/authenticationUser.js";
import type { IAuthHeaderProcessorConstructorOptions } from "../models/IAuthHeaderProcessorConstructorOptions.js";
import type { IAuthTokenContext } from "../models/IAuthTokenContext.js";
import { AccountHelper } from "../utils/accountHelper.js";
import { AuthTokenCache } from "../utils/authTokenCache.js";
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
	 * The default SameSite attribute of the token cookie.
	 */
	public static readonly DEFAULT_COOKIE_SAME_SITE: CookieSameSite = CookieSameSite.None;

	/**
	 * The default other cookies to remove on logout.
	 */
	public static readonly DEFAULT_LOGOUT_COOKIE_NAMES: string[] = ["oauth_transaction"];

	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<AuthHeaderProcessor>();

	/**
	 * The default time to keep a verified token in the cache.
	 * @internal
	 */
	private static readonly _DEFAULT_TOKEN_CACHE_TTL_MS: number = 30 * DurationConstants.MsPerSecond;

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
	 * The SameSite attribute of the token cookie.
	 * @internal
	 */
	private readonly _cookieSameSite: CookieSameSite;

	/**
	 * The other cookies to remove on logout.
	 * @internal
	 */
	private readonly _logoutCookieNames: string[];

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
	 * The cache keys of the tokens of each account, so its tokens can be cleared when its sessions end.
	 * @internal
	 */
	private readonly _accountCacheKeys: Map<string, Set<string>>;

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
		this._cookieSameSite =
			options?.config?.cookieSameSite ?? AuthHeaderProcessor.DEFAULT_COOKIE_SAME_SITE;
		Guards.arrayOneOf(
			AuthHeaderProcessor.CLASS_NAME,
			nameof(options?.config?.cookieSameSite),
			this._cookieSameSite,
			Object.values(CookieSameSite)
		);
		this._logoutCookieNames =
			options?.config?.logoutCookieNames ?? AuthHeaderProcessor.DEFAULT_LOGOUT_COOKIE_NAMES;
		this._includeErrorStack = options?.config?.includeErrorStack ?? false;

		this._tokenCacheTtlMs =
			options?.config?.tokenCacheTtlMs ?? AuthHeaderProcessor._DEFAULT_TOKEN_CACHE_TTL_MS;
		this._accountCacheKeys = new Map<string, Set<string>>();
		if (this._tokenCacheTtlMs > 0) {
			this._tokenCache = new LfuCache<IAuthTokenContext>({
				capacity: options?.config?.tokenCacheCapacity,
				ttiMs: this._tokenCacheTtlMs,
				mutexTimeoutMs: options?.config?.tokenCacheMutexTimeoutMs
			});
			AuthTokenCache.register(this._tokenCache, this._accountCacheKeys);
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
		if (Is.object(this._tokenCache)) {
			AuthTokenCache.unregister(this._tokenCache);
			this._tokenCache.destroy();
		}
		this._accountCacheKeys.clear();
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
				contextIds[ContextIdKeys.Account] = tokenContext.accountId;

				// If the tenant has a custom public origin, we set it in the context for downstream processors to use.
				if (Is.stringValue(tokenContext.tenantPublicOrigin)) {
					contextIds[HttpContextIdKeys.PublicOrigin] = tokenContext.tenantPublicOrigin;
				}

				processorState.authToken = tokenAndLocation?.token;
				processorState.authTokenLocation = tokenAndLocation?.location;
				processorState.authSessionStart = tokenContext.sessionStart;
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
				(responseAuthOperation === AuthOperation.Login ||
					responseAuthOperation === AuthOperation.Refresh) &&
				Is.stringValue(responseAuthToken)
			) {
				this.appendSetCookie(
					response,
					CookieHelper.createCookie(this._cookieName, responseAuthToken, {
						secure: true,
						httpOnly: true,
						sameSite: this._cookieSameSite,
						path: "/"
					})
				);
			} else if (responseAuthOperation === AuthOperation.Logout) {
				this.appendSetCookie(
					response,
					CookieHelper.deleteCookie(this._cookieName, {
						secure: true,
						httpOnly: true,
						sameSite: this._cookieSameSite,
						path: "/"
					})
				);
				for (const cookieName of this._logoutCookieNames) {
					this.appendSetCookie(
						response,
						CookieHelper.deleteCookie(cookieName, {
							secure: true,
							httpOnly: true,
							sameSite: CookieSameSite.Lax,
							path: "/"
						})
					);
				}
			}
		}
	}

	/**
	 * Add a cookie to the response, keeping any the route has already set.
	 * @param response The outgoing response.
	 * @param cookie The Set-Cookie value.
	 * @internal
	 */
	private appendSetCookie(response: IHttpResponse, cookie: string): void {
		response.headers ??= {};
		const existing = response.headers[HeaderTypes.SetCookie];
		response.headers[HeaderTypes.SetCookie] = Is.empty(existing)
			? cookie
			: [...(Is.array(existing) ? existing : [existing]), cookie];
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

		const generation = AuthTokenCache.generation();
		let verified = false;
		const tokenContext = await this._tokenCache.getOrSet(
			cacheKey,
			async () => {
				verified = true;
				return this.verifyToken(nodeId, token, contextIds);
			},
			Date.now() + this._tokenCacheTtlMs
		);

		// A token can expire while its context sits in the cache.
		if (Is.integer(tokenContext.expires) && tokenContext.expires <= Date.now()) {
			this._tokenCache.delete(cacheKey);
			return this.verifyToken(nodeId, token, contextIds);
		}

		if (generation !== AuthTokenCache.generation()) {
			// Sessions ended while the token was verified, or while this request waited for another
			// request verifying it, so the result may predate that and is neither kept nor used.
			this._tokenCache.delete(cacheKey);
			return this.verifyToken(nodeId, token, contextIds);
		}

		if (verified && Is.stringValue(tokenContext.accountId)) {
			AuthTokenCache.track(
				this._tokenCache,
				this._accountCacheKeys,
				tokenContext.accountId,
				cacheKey
			);
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
			async (sub: string, tid: string | undefined, passwordVersion: number | undefined) => {
				const validParts = [];

				tenantId = tid;

				// We use the tenant id from the token, if the user is not in that
				// partition then the get will fail
				const contextIdsForUserLookup = {
					...contextIds,
					[ContextIdKeys.Tenant]: tid
				};

				const [tenant, tokenUser] = await Promise.all([
					Is.stringValue(tid) ? this._tenantAdminComponent?.get(tid) : undefined,
					// Wrap the user lookup in the request context so partitioned storage uses the correct tenant.
					ContextIdStore.run(contextIdsForUserLookup, async () => this._userEntityStorage.get(sub))
				]);
				user = tokenUser;

				if (Is.stringValue(tid) && tenant?.id === tid) {
					validParts.push("tenant");
					tenantOrganizationId = tenant.organizationId;
					tenantPublicOrigin = tenant.publicOrigin;
				}

				// A disabled or unverified account is refused even with a token issued before.
				if (
					user?.accountId === sub &&
					(passwordVersion ?? 0) === (user.passwordVersion ?? 0) &&
					AccountHelper.canSignIn(user)
				) {
					validParts.push("user");
				}

				return validParts;
			}
		);

		const expiresSeconds = Coerce.integer(payload.exp);

		return {
			tenantId,
			tenantOrganizationId,
			tenantPublicOrigin,
			accountId: user?.accountId,
			expires: Is.integer(expiresSeconds)
				? expiresSeconds * DurationConstants.MsPerSecond
				: undefined,
			sessionStart: Coerce.integer(payload.sst)
		};
	}
}
