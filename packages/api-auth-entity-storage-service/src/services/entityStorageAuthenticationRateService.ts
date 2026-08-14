// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type {
	IAuthenticationRateActionConfig,
	IAuthenticationRateComponent
} from "@twin.org/api-auth-entity-storage-models";
import { TooManyRequestsError, type IPlatformComponent } from "@twin.org/api-models";
import type { ITaskSchedulerComponent } from "@twin.org/background-task-models";
import { ComponentFactory, Converter, GeneralError, Guards, Is } from "@twin.org/core";
import { Sha256 } from "@twin.org/crypto";
import { ComparisonOperator } from "@twin.org/entity";
import {
	EntityStorageConnectorFactory,
	type IEntityStorageConnector
} from "@twin.org/entity-storage-models";
import { nameof } from "@twin.org/nameof";
import type { AuthenticationRateEntry } from "../entities/authenticationRateEntry.js";
import type { IEntityStorageAuthenticationRateServiceConstructorOptions } from "../models/IEntityStorageAuthenticationRateServiceConstructorOptions.js";

/**
 * Implementation of the authentication rate component using entity storage.
 */
export class EntityStorageAuthenticationRateService implements IAuthenticationRateComponent {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<EntityStorageAuthenticationRateService>();

	/**
	 * Cleanup task id.
	 * @internal
	 */
	private static readonly _CLEANUP_TASK_ID = "authentication-rate-cleanup";

	/**
	 * Default cleanup interval in minutes.
	 * @internal
	 */
	private static readonly _DEFAULT_CLEANUP_INTERVAL_MINUTES = 5;

	/**
	 * Number of entries to retrieve in each cleanup page.
	 * @internal
	 */
	private static readonly _CLEANUP_PAGE_SIZE = 250;

	/**
	 * The entity storage for authentication rate entries.
	 * @internal
	 */
	private readonly _authenticationRateEntryStorage: IEntityStorageConnector<AuthenticationRateEntry>;

	/**
	 * The rate limits for each action.
	 * @internal
	 */
	private readonly _actionConfigs: { [action: string]: IAuthenticationRateActionConfig };

	/**
	 * The task scheduler.
	 * @internal
	 */
	private readonly _taskScheduler: ITaskSchedulerComponent;

	/**
	 * The cleanup interval in minutes.
	 * @internal
	 */
	private readonly _cleanupIntervalMinutes: number;

	/**
	 * Platform component used to run the periodic cleanup with the correct tenant context.
	 * @internal
	 */
	private readonly _platformComponent: IPlatformComponent;

	/**
	 * Create a new instance of EntityStorageAuthenticationRateService.
	 * @param options The constructor options.
	 */
	constructor(options?: IEntityStorageAuthenticationRateServiceConstructorOptions) {
		this._authenticationRateEntryStorage = EntityStorageConnectorFactory.get(
			options?.authenticationRateEntryStorageType ?? "authentication-rate-entry"
		);
		this._actionConfigs = {};
		this._taskScheduler = ComponentFactory.get<ITaskSchedulerComponent>(
			options?.taskSchedulerComponentType ?? "task-scheduler"
		);
		this._cleanupIntervalMinutes =
			options?.config?.cleanupIntervalMinutes ??
			EntityStorageAuthenticationRateService._DEFAULT_CLEANUP_INTERVAL_MINUTES;
		this._platformComponent = ComponentFactory.get<IPlatformComponent>(
			options?.platformComponentType ?? "platform"
		);
	}

	/**
	 * Register or update rate-limit configuration for an action.
	 * @param action The action name.
	 * @param config The action configuration.
	 * @returns A promise that resolves when the action configuration has been stored.
	 */
	public async registerAction(
		action: string,
		config: IAuthenticationRateActionConfig
	): Promise<void> {
		Guards.stringValue(EntityStorageAuthenticationRateService.CLASS_NAME, nameof(action), action);
		Guards.object<IAuthenticationRateActionConfig>(
			EntityStorageAuthenticationRateService.CLASS_NAME,
			nameof(config),
			config
		);

		this._actionConfigs[action] = {
			maxAttempts: config.maxAttempts,
			windowMinutes: config.windowMinutes
		};
	}

	/**
	 * Unregister rate-limit configuration for an action.
	 * @param action The action name.
	 * @returns A promise that resolves when the action configuration has been removed.
	 */
	public async unregisterAction(action: string): Promise<void> {
		Guards.stringValue(EntityStorageAuthenticationRateService.CLASS_NAME, nameof(action), action);

		delete this._actionConfigs[action];
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return EntityStorageAuthenticationRateService.CLASS_NAME;
	}

	/**
	 * The service needs to be started when the application is initialized.
	 * @param nodeLoggingComponentType The node logging component type.
	 * @returns A promise that resolves when the periodic cleanup task has been registered.
	 */
	public async start(nodeLoggingComponentType?: string): Promise<void> {
		await this._taskScheduler.addTask(
			EntityStorageAuthenticationRateService._CLEANUP_TASK_ID,
			[
				{
					intervalMinutes: this._cleanupIntervalMinutes
				}
			],
			async () => this.cleanupExpiredEntries()
		);
	}

	/**
	 * The component needs to be stopped when the node is closed.
	 * @param nodeLoggingComponentType The node logging component type.
	 * @returns A promise that resolves when the periodic cleanup task has been removed.
	 */
	public async stop(nodeLoggingComponentType?: string): Promise<void> {
		await this._taskScheduler.removeTask(EntityStorageAuthenticationRateService._CLEANUP_TASK_ID);
	}

	/**
	 * Check the authentication rate for a given action and identifier.
	 * @param action The action to be checked.
	 * @param identifier The identifier to be checked.
	 * @returns The rate entry id.
	 */
	public async check(action: string, identifier: string): Promise<string> {
		Guards.stringValue(EntityStorageAuthenticationRateService.CLASS_NAME, nameof(action), action);
		Guards.stringValue(
			EntityStorageAuthenticationRateService.CLASS_NAME,
			nameof(identifier),
			identifier
		);

		const actionConfig = this._actionConfigs[action];

		if (!Is.object(actionConfig)) {
			throw new GeneralError(
				EntityStorageAuthenticationRateService.CLASS_NAME,
				"actionConfigMissing",
				{
					action
				}
			);
		}

		const hashedIdentifier = Converter.bytesToHex(Sha256.sum256(Converter.utf8ToBytes(identifier)));
		const compositeId = `|${action}|${hashedIdentifier}|`;

		const now = Date.now();
		const nowIso = new Date(now).toISOString();
		const windowMs = actionConfig.windowMinutes * 60 * 1000;
		const cutoff = now - windowMs;

		// Resolve the existing rate entry for this action + identifier pair.
		const existing = await this._authenticationRateEntryStorage.get(compositeId);
		// Keep only attempts inside the configured sliding window.
		const activeTimestamps = (existing?.timestamps ?? []).filter(
			timestamp => new Date(timestamp).getTime() > cutoff
		);

		if (activeTimestamps.length >= actionConfig.maxAttempts) {
			const oldestTimestamp = new Date(activeTimestamps[0]).getTime();
			const nextRequestTime = new Date(oldestTimestamp + windowMs).toISOString();
			const retryAfterSeconds = Math.ceil((oldestTimestamp + windowMs - now) / 1000);

			throw new TooManyRequestsError(
				EntityStorageAuthenticationRateService.CLASS_NAME,
				"rateLimitExceeded",
				activeTimestamps.length,
				nextRequestTime,
				{
					action,
					retryAfterSeconds
				}
			);
		}

		activeTimestamps.push(nowIso);

		await this._authenticationRateEntryStorage.set({
			id: compositeId,
			timestamps: activeTimestamps,
			dateModified: nowIso
		});

		return compositeId;
	}

	/**
	 * Clear the authentication rate entry for the given action and identifier.
	 * @param action The action to clear.
	 * @param identifier The identifier to clear.
	 * @returns A promise that resolves when the rate entry has been removed.
	 */
	public async clear(action: string, identifier: string): Promise<void> {
		Guards.stringValue(EntityStorageAuthenticationRateService.CLASS_NAME, nameof(action), action);
		Guards.stringValue(
			EntityStorageAuthenticationRateService.CLASS_NAME,
			nameof(identifier),
			identifier
		);

		const hashedIdentifier = Converter.bytesToHex(Sha256.sum256(Converter.utf8ToBytes(identifier)));
		const compositeId = `|${action}|${hashedIdentifier}|`;

		await this._authenticationRateEntryStorage.remove(compositeId);
	}

	/**
	 * Cleanup expired rate limit entries. Runs via the platform component's execute so the work runs with
	 * the correct context (once in single-tenant mode, once per tenant in multi-tenant mode).
	 * @returns A promise that resolves when all expired entries have been removed from storage.
	 * @internal
	 */
	private async cleanupExpiredEntries(): Promise<void> {
		// Run via the platform component's execute so the work runs with the correct context (once in
		// single-tenant mode, once per tenant in multi-tenant mode).
		await this._platformComponent.execute(async () => {
			const now = Date.now();

			for (const action of Object.keys(this._actionConfigs)) {
				const actionConfig = this._actionConfigs[action];
				const windowMs = actionConfig.windowMinutes * 60 * 1000;
				const cutoffIso = new Date(now - windowMs).toISOString();
				let cursor: string | undefined;

				do {
					// Query by composite rate entry id prefix and expiry window for this action.
					const result = await this._authenticationRateEntryStorage.query(
						{
							conditions: [
								{
									property: "id",
									value: `|${action}|`,
									comparison: ComparisonOperator.Includes
								},
								{
									property: "dateModified",
									value: cutoffIso,
									comparison: ComparisonOperator.LessThanOrEqual
								}
							]
						},
						undefined,
						undefined,
						cursor,
						EntityStorageAuthenticationRateService._CLEANUP_PAGE_SIZE
					);

					for (const entity of result.entities as AuthenticationRateEntry[]) {
						await this._authenticationRateEntryStorage.remove(entity.id);
					}

					cursor = result.cursor;
				} while (!Is.empty(cursor));
			}
		});
	}
}
