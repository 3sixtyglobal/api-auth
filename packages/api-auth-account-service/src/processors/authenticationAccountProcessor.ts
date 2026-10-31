// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import {
	AuthenticationAccountDataType,
	AuthenticationAccountHelper
} from "@3sixty/api-auth-models";
import type {
	IBaseRoute,
	IBaseRouteProcessor,
	IHttpResponse,
	IHttpServerRequest
} from "@3sixty/api-models";
import { ContextIdKeys, ContextIdStore, type IContextIds } from "@3sixty/context";
import { Is, LfuCache } from "@3sixty/core";
import {
	EntityStorageConnectorFactory,
	type IEntityStorageConnector
} from "@3sixty/entity-storage-models";
import { nameof } from "@3sixty/nameof";
import type { AccountData } from "../entities/accountData.js";
import type { IAuthenticationAccountContext } from "../models/IAuthenticationAccountContext.js";
import type { IAuthenticationAccountProcessorConstructorOptions } from "../models/IAuthenticationAccountProcessorConstructorOptions.js";
import { AccountContextCache } from "../utils/accountContextCache.js";
import { AccountDataHelper } from "../utils/accountDataHelper.js";

/**
 * Sets the identity and organization of the signed in account on the request context, so routes
 * can be authorized against the identity. Run it after the auth header processor. Changes to the
 * identity or organization of an account clear its cached entry in this process, other processes
 * keep theirs until the time to live expires. An account without an identity is kept for a shorter
 * time, noIdentityCacheTtlMs.
 */
export class AuthenticationAccountProcessor implements IBaseRouteProcessor {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<AuthenticationAccountProcessor>();

	/**
	 * The default time to keep an account in the cache.
	 * @internal
	 */
	private static readonly _DEFAULT_CACHE_TTL_MS: number = 30000;

	/**
	 * The default time to keep an account without an identity in the cache.
	 * @internal
	 */
	private static readonly _DEFAULT_NO_IDENTITY_CACHE_TTL_MS: number = 5000;

	/**
	 * The entity storage for account data.
	 * @internal
	 */
	private readonly _accountDataEntityStorage: IEntityStorageConnector<AccountData>;

	/**
	 * The cache of resolved accounts, undefined when caching is disabled.
	 * @internal
	 */
	private readonly _cache?: LfuCache<IAuthenticationAccountContext>;

	/**
	 * How long an account may stay in the cache, in milliseconds.
	 * @internal
	 */
	private readonly _cacheTtlMs: number;

	/**
	 * How long an account without an identity may stay in the cache, in milliseconds.
	 * @internal
	 */
	private readonly _noIdentityCacheTtlMs: number;

	/**
	 * The loads in progress by cache key, so concurrent requests for an account share one load.
	 * @internal
	 */
	private readonly _loads: Map<
		string,
		{ promise: Promise<IAuthenticationAccountContext>; generation: number }
	>;

	/**
	 * Create a new instance of AuthenticationAccountProcessor.
	 * @param options The options for the processor.
	 */
	constructor(options?: IAuthenticationAccountProcessorConstructorOptions) {
		this._accountDataEntityStorage = EntityStorageConnectorFactory.get(
			options?.accountDataEntityStorageType ?? "account-data"
		);
		this._cacheTtlMs =
			options?.config?.cacheTtlMs ?? AuthenticationAccountProcessor._DEFAULT_CACHE_TTL_MS;
		this._noIdentityCacheTtlMs = Math.min(
			options?.config?.noIdentityCacheTtlMs ??
				AuthenticationAccountProcessor._DEFAULT_NO_IDENTITY_CACHE_TTL_MS,
			this._cacheTtlMs
		);
		this._loads = new Map();
		if (this._cacheTtlMs > 0) {
			this._cache = new LfuCache<IAuthenticationAccountContext>({
				capacity: options?.config?.cacheCapacity,
				ttiMs: this._cacheTtlMs
			});
			AccountContextCache.register(this._cache);
		}
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return AuthenticationAccountProcessor.CLASS_NAME;
	}

	/**
	 * Stop the processor and release the cache.
	 * @returns A promise that resolves when the processor has stopped.
	 */
	public async stop(): Promise<void> {
		if (!Is.empty(this._cache)) {
			AccountContextCache.unregister(this._cache);
			this._cache.destroy();
		}
	}

	/**
	 * Set the identity and organization of the signed in account on the request context.
	 * @param request The incoming request.
	 * @param response The outgoing response.
	 * @param route The route to process.
	 * @param contextIds The context IDs of the request.
	 * @param processorState The state handed through the processors.
	 * @returns A promise that resolves when the context has been populated.
	 */
	public async pre(
		request: IHttpServerRequest,
		response: IHttpResponse,
		route: IBaseRoute | undefined,
		contextIds: IContextIds,
		processorState: { [id: string]: unknown }
	): Promise<void> {
		const accountId = contextIds[ContextIdKeys.Account];
		if (Is.empty(route) || (route.skipAuth ?? false) || !Is.stringValue(accountId)) {
			// If no account id is set, or the route skips authentication, do nothing.
			return;
		}

		const account = await this.resolveAccount(accountId, contextIds);
		if (Is.stringValue(account.identity)) {
			contextIds[ContextIdKeys.User] = account.identity;
		}
		if (Is.stringValue(account.organization)) {
			contextIds[ContextIdKeys.UserOrganization] = account.organization;
		}
	}

	/**
	 * Resolve the identity and organization of an account, through the cache when one is enabled.
	 * @param accountId The account id.
	 * @param contextIds The context IDs of the request, used for the storage partition.
	 * @returns The identity and organization.
	 * @internal
	 */
	private async resolveAccount(
		accountId: string,
		contextIds: IContextIds
	): Promise<IAuthenticationAccountContext> {
		if (Is.empty(this._cache)) {
			return this.loadAccount(accountId, contextIds);
		}
		// Account data is partitioned by tenant, so the same account id can resolve differently per tenant.
		const cacheKey = AccountContextCache.key(contextIds[ContextIdKeys.Tenant], accountId);
		const cached = this._cache.get(cacheKey);
		if (Is.object(cached)) {
			return cached;
		}

		// Concurrent misses share a load, unless the account was cleared after it started.
		const inProgress = this._loads.get(cacheKey);
		if (
			!Is.empty(inProgress) &&
			inProgress.generation === AccountContextCache.generation(cacheKey)
		) {
			return inProgress.promise;
		}

		const generation = AccountContextCache.loadStarted(cacheKey);
		const promise = this.loadAndCache(cacheKey, generation, accountId, contextIds);
		this._loads.set(cacheKey, { promise, generation });
		return promise;
	}

	/**
	 * Load an account and store it in the cache, unless it was cleared while it loaded.
	 * @param cacheKey The cache key of the account.
	 * @param generation The generation of the account when the load started.
	 * @param accountId The account id.
	 * @param contextIds The context IDs of the request, used for the storage partition.
	 * @returns The identity and organization.
	 * @internal
	 */
	private async loadAndCache(
		cacheKey: string,
		generation: number,
		accountId: string,
		contextIds: IContextIds
	): Promise<IAuthenticationAccountContext> {
		let account: IAuthenticationAccountContext;
		let unchanged: boolean;
		try {
			account = await this.loadAccount(accountId, contextIds);
		} finally {
			unchanged = AccountContextCache.loadEnded(cacheKey, generation);
			if (this._loads.get(cacheKey)?.generation === generation) {
				this._loads.delete(cacheKey);
			}
		}

		// An account without an identity is only kept briefly, so an identity it adopts through another
		// process is used soon, while a stale entry only withholds the identity.
		const ttlMs = Is.stringValue(account.identity) ? this._cacheTtlMs : this._noIdentityCacheTtlMs;
		if (unchanged && ttlMs > 0) {
			this._cache?.set(cacheKey, account, Date.now() + ttlMs);
		}
		return account;
	}

	/**
	 * Load the identity and organization of an account from storage.
	 * @param accountId The account id.
	 * @param contextIds The context IDs of the request, used for the storage partition.
	 * @returns The identity and organization.
	 * @internal
	 */
	private async loadAccount(
		accountId: string,
		contextIds: IContextIds
	): Promise<IAuthenticationAccountContext> {
		return ContextIdStore.run(contextIds, async () => {
			const [identity, organization] = await Promise.all([
				this.loadData(accountId, AuthenticationAccountDataType.Identity),
				this.loadData(accountId, AuthenticationAccountDataType.Organization)
			]);
			return {
				identity: AuthenticationAccountHelper.getIdentity(identity),
				organization: AuthenticationAccountHelper.getOrganization(organization)
			};
		});
	}

	/**
	 * Load the value of a type for an account, the default item, otherwise the earliest created.
	 * @param accountId The account id.
	 * @param type The type of the item.
	 * @returns The value, or undefined when the account has none.
	 * @internal
	 */
	private async loadData(accountId: string, type: string): Promise<unknown> {
		const item = await AccountDataHelper.getDefault(
			this._accountDataEntityStorage,
			accountId,
			type
		);
		return item?.data;
	}
}
