// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { TooManyRequestsError, type IPlatformComponent } from "@twin.org/api-models";
import type { ITaskSchedulerComponent } from "@twin.org/background-task-models";
import { ContextIdKeys, ContextIdStore } from "@twin.org/context";
import { BaseError, ComponentFactory, Converter, GeneralError } from "@twin.org/core";
import { Sha256 } from "@twin.org/crypto";
import { ComparisonOperator } from "@twin.org/entity";
import { MemoryEntityStorageConnector } from "@twin.org/entity-storage-connector-memory";
import {
	EntityStorageConnectorFactory,
	type IEntityStorageConnector
} from "@twin.org/entity-storage-models";
import { nameof } from "@twin.org/nameof";
import type { AuthenticationRateEntry } from "../../src/entities/authenticationRateEntry.js";
import { initSchema } from "../../src/schema.js";
import { EntityStorageAuthenticationRateService } from "../../src/services/entityStorageAuthenticationRateService.js";

describe("EntityStorageAuthenticationRateService", () => {
	let addTaskMock: ReturnType<typeof vi.fn>;
	let getMock: ReturnType<typeof vi.fn>;
	let mockTaskScheduler: ITaskSchedulerComponent;
	let removeTaskMock: ReturnType<typeof vi.fn>;
	let setMock: ReturnType<typeof vi.fn>;
	let removeMock: ReturnType<typeof vi.fn>;
	let queryMock: ReturnType<typeof vi.fn>;
	let mockRateEntryStorage: IEntityStorageConnector;
	let scheduledCleanup: (() => Promise<void>) | undefined;
	let service: EntityStorageAuthenticationRateService;

	beforeEach(async () => {
		vi.restoreAllMocks();
		vi.setSystemTime(new Date("2026-04-13T10:00:00.000Z"));

		addTaskMock = vi.fn().mockImplementation(async (taskId, times, taskCallback) => {
			scheduledCleanup = taskCallback;
		});
		getMock = vi.fn();
		removeTaskMock = vi.fn();
		setMock = vi.fn();
		removeMock = vi.fn();
		queryMock = vi.fn().mockResolvedValue({ entities: [], cursor: undefined });

		mockRateEntryStorage = {
			get: getMock,
			set: setMock,
			remove: removeMock,
			query: queryMock
		} as unknown as IEntityStorageConnector;

		mockTaskScheduler = {
			addTask: addTaskMock,
			removeTask: removeTaskMock,
			// Also serves as the platform component in these tests (ComponentFactory.get is mocked to return
			// this for every type); execute runs the work once, mirroring single-tenant mode.
			execute: async (method: () => Promise<void>) => method()
		} as unknown as ITaskSchedulerComponent;

		vi.spyOn(EntityStorageConnectorFactory, "get").mockReturnValue(mockRateEntryStorage);
		vi.spyOn(ComponentFactory, "get").mockReturnValue(mockTaskScheduler);

		service = new EntityStorageAuthenticationRateService({
			config: {
				cleanupIntervalMinutes: 5
			}
		});

		await service.registerAction("login", {
			maxAttempts: 2,
			windowMinutes: 15
		});
	});

	afterEach(async () => {
		await service.stop();
	});

	it("should return the class name", () => {
		expect(service.className()).toBe(EntityStorageAuthenticationRateService.CLASS_NAME);
	});

	it("should create a new entry for the first attempt", async () => {
		getMock.mockResolvedValue(undefined);
		const expectedHashedIdentifier = Converter.bytesToHex(
			Sha256.sum256(Converter.utf8ToBytes("user@example.com"))
		);
		const expectedId = `|login|${expectedHashedIdentifier}|`;

		const id = await service.check("login", "user@example.com");

		expect(id).toBe(expectedId);
		expect(getMock).toHaveBeenCalledWith(expectedId);
		expect(setMock).toHaveBeenCalledWith({
			id: expectedId,
			timestamps: ["2026-04-13T10:00:00.000Z"],
			dateModified: "2026-04-13T10:00:00.000Z"
		});
	});

	it("should increment attempts within the configured window", async () => {
		const expectedHashedIdentifier = Converter.bytesToHex(
			Sha256.sum256(Converter.utf8ToBytes("user@example.com"))
		);
		const expectedId = `|login|${expectedHashedIdentifier}|`;
		getMock.mockResolvedValue({
			id: expectedId,
			timestamps: ["2026-04-13T09:55:00.000Z"],
			dateModified: "2026-04-13T09:55:00.000Z"
		});

		const id = await service.check("login", "user@example.com");

		expect(id).toBe(expectedId);
		expect(setMock).toHaveBeenCalledWith({
			id: expectedId,
			timestamps: ["2026-04-13T09:55:00.000Z", "2026-04-13T10:00:00.000Z"],
			dateModified: "2026-04-13T10:00:00.000Z"
		});
	});

	it("should throw when the configured rate limit is exceeded", async () => {
		const expectedHashedIdentifier = Converter.bytesToHex(
			Sha256.sum256(Converter.utf8ToBytes("user@example.com"))
		);
		getMock.mockResolvedValue({
			id: `|login|${expectedHashedIdentifier}|`,
			timestamps: ["2026-04-13T09:55:00.000Z", "2026-04-13T09:58:00.000Z"],
			dateModified: "2026-04-13T09:58:00.000Z"
		});

		await expect(service.check("login", "user@example.com")).rejects.toThrow(TooManyRequestsError);
		expect(setMock).not.toHaveBeenCalled();
	});

	it("should include retryAfterSeconds and nextRequestTime in the rate limit error", async () => {
		// window is 15 min; oldest timestamp is 09:55, now is 10:00 → window expires at 10:10
		// retryAfterSeconds = ceil((09:55 + 15min - 10:00) / 1000) = 600
		const expectedHashedIdentifier = Converter.bytesToHex(
			Sha256.sum256(Converter.utf8ToBytes("user@example.com"))
		);
		getMock.mockResolvedValue({
			id: `|login|${expectedHashedIdentifier}|`,
			timestamps: ["2026-04-13T09:55:00.000Z", "2026-04-13T09:58:00.000Z"],
			dateModified: "2026-04-13T09:58:00.000Z"
		});

		let caught: unknown;
		try {
			await service.check("login", "user@example.com");
		} catch (err) {
			caught = err;
		}

		expect(BaseError.isErrorName(caught, TooManyRequestsError.CLASS_NAME)).toBe(true);
		const error = caught as TooManyRequestsError;
		expect(error.properties?.retryAfterSeconds).toBe(600);
		expect(error.properties?.nextRequestTime).toBe("2026-04-13T10:10:00.000Z");
	});

	it("should prune expired timestamps and allow a new attempt", async () => {
		// The stored timestamp is outside the 15-minute window - it should be discarded,
		// leaving zero active attempts so the check succeeds.
		const expectedHashedIdentifier = Converter.bytesToHex(
			Sha256.sum256(Converter.utf8ToBytes("user@example.com"))
		);
		const expectedId = `|login|${expectedHashedIdentifier}|`;
		getMock.mockResolvedValue({
			id: expectedId,
			timestamps: ["2026-04-13T09:44:59.000Z"],
			dateModified: "2026-04-13T09:44:59.000Z"
		});

		const id = await service.check("login", "user@example.com");

		expect(id).toBe(expectedId);
		expect(setMock).toHaveBeenCalledWith({
			id: expectedId,
			timestamps: ["2026-04-13T10:00:00.000Z"],
			dateModified: "2026-04-13T10:00:00.000Z"
		});
	});

	it("should throw when the action has no configuration", async () => {
		await expect(service.check("refresh", "user@example.com")).rejects.toThrow(GeneralError);
		expect(getMock).not.toHaveBeenCalled();
		expect(setMock).not.toHaveBeenCalled();
	});

	it("should clear an existing entry for action and identifier", async () => {
		const expectedHashedIdentifier = Converter.bytesToHex(
			Sha256.sum256(Converter.utf8ToBytes("user@example.com"))
		);
		const expectedId = `|login|${expectedHashedIdentifier}|`;

		await service.clear("login", "user@example.com");

		expect(removeMock).toHaveBeenCalledWith(expectedId);
	});

	it("should overwrite existing action config when registering again", async () => {
		await service.registerAction("login", {
			maxAttempts: 1,
			windowMinutes: 15
		});

		const expectedHashedIdentifier = Converter.bytesToHex(
			Sha256.sum256(Converter.utf8ToBytes("user@example.com"))
		);
		getMock.mockResolvedValue({
			id: `|login|${expectedHashedIdentifier}|`,
			timestamps: ["2026-04-13T09:58:00.000Z"],
			dateModified: "2026-04-13T09:58:00.000Z"
		});

		await expect(service.check("login", "user@example.com")).rejects.toThrow(TooManyRequestsError);
		expect(setMock).not.toHaveBeenCalled();
	});

	it("should stop applying limits when action is unregistered", async () => {
		await service.unregisterAction("login");

		await expect(service.check("login", "user@example.com")).rejects.toThrow(GeneralError);
		expect(getMock).not.toHaveBeenCalled();
		expect(setMock).not.toHaveBeenCalled();
	});

	it("should register the cleanup task in start", async () => {
		await service.start();

		expect(addTaskMock).toHaveBeenCalledWith(
			"authentication-rate-cleanup",
			[{ intervalMinutes: 5 }],
			expect.any(Function)
		);
	});

	it("should remove the cleanup task in stop", async () => {
		await service.stop();

		expect(removeTaskMock).toHaveBeenCalledWith("authentication-rate-cleanup");
	});

	it("should cleanup expired entries", async () => {
		queryMock
			.mockResolvedValueOnce({
				entities: [
					{
						id: "|login|hash1|",
						timestamps: ["2026-04-13T09:30:00.000Z"],
						dateModified: "2026-04-13T09:30:00.000Z"
					},
					{
						id: "|login|hash3|",
						timestamps: ["2026-04-13T09:30:00.000Z"],
						dateModified: "2026-04-13T09:30:00.000Z"
					}
				],
				cursor: "next-page"
			})
			.mockResolvedValueOnce({
				entities: [
					{
						id: "|login|hash2|",
						timestamps: ["2026-04-13T09:40:00.000Z"],
						dateModified: "2026-04-13T09:40:00.000Z"
					}
				],
				cursor: undefined
			});
		await service.start();
		vi.setSystemTime(new Date("2026-04-13T10:05:00.000Z"));

		if (scheduledCleanup) {
			await scheduledCleanup();
		}

		expect(removeMock).toHaveBeenCalledWith("|login|hash1|");
		expect(removeMock).toHaveBeenCalledWith("|login|hash3|");
		expect(removeMock).toHaveBeenCalledWith("|login|hash2|");
		expect(setMock).not.toHaveBeenCalled();
		expect(queryMock).toHaveBeenCalledTimes(2);

		const firstQueryCall = queryMock.mock.calls[0];
		expect(firstQueryCall[0]).toEqual({
			conditions: [
				{
					property: "id",
					value: "|login|",
					comparison: ComparisonOperator.Includes
				},
				{
					property: "dateModified",
					value: "2026-04-13T09:50:00.000Z",
					comparison: ComparisonOperator.LessThanOrEqual
				}
			]
		});
		expect(firstQueryCall[3]).toBeUndefined();
		expect(firstQueryCall[4]).toBe(250);

		const secondQueryCall = queryMock.mock.calls[1];
		expect(secondQueryCall[0]).toEqual({
			conditions: [
				{
					property: "id",
					value: "|login|",
					comparison: ComparisonOperator.Includes
				},
				{
					property: "dateModified",
					value: "2026-04-13T09:50:00.000Z",
					comparison: ComparisonOperator.LessThanOrEqual
				}
			]
		});
		expect(secondQueryCall[3]).toBe("next-page");
		expect(secondQueryCall[4]).toBe(250);
	});
});

describe("EntityStorageAuthenticationRateService - multi-tenant cleanup (tenant context)", () => {
	let rateStorage: MemoryEntityStorageConnector<AuthenticationRateEntry>;
	let scheduledCleanup: (() => Promise<void>) | undefined;
	let service: EntityStorageAuthenticationRateService;

	beforeAll(() => {
		initSchema();
	});

	beforeEach(async () => {
		vi.restoreAllMocks();
		scheduledCleanup = undefined;

		// Real tenant-partitioned storage, mirroring a multi-tenant (e.g. MySQL) deployment: query()
		// derives its partition key from the tenant context, so it throws contextIdMissing when none is set.
		rateStorage = new MemoryEntityStorageConnector<AuthenticationRateEntry>({
			entitySchema: nameof<AuthenticationRateEntry>(),
			partitionContextIds: [ContextIdKeys.Tenant],
			config: { storageKey: "auth-rate-entry" }
		});
		EntityStorageConnectorFactory.register("authentication-rate-entry", () => rateStorage);

		const taskScheduler = {
			addTask: vi.fn(async (taskId: string, times: unknown, cb: () => Promise<void>) => {
				scheduledCleanup = cb;
			}),
			removeTask: vi.fn()
		} as unknown as ITaskSchedulerComponent;
		ComponentFactory.register("task-scheduler", () => taskScheduler);

		// Platform component that runs work within a tenant's context, as the real multi-tenant platform
		// does per tenant. The fix routes the cleanup through this so the partitioned query has a tenant.
		const platform = {
			execute: async (method: () => Promise<void>) => {
				await ContextIdStore.run(
					{ [ContextIdKeys.Node]: "did:iota:node", [ContextIdKeys.Tenant]: "did:iota:tenant-a" },
					method
				);
			}
		} as unknown as IPlatformComponent;
		ComponentFactory.register("platform", () => platform);

		service = new EntityStorageAuthenticationRateService({ config: { cleanupIntervalMinutes: 5 } });
		await service.registerAction("login", { maxAttempts: 2, windowMinutes: 15 });
		await service.start();
	});

	afterEach(async () => {
		await service?.stop();
		EntityStorageConnectorFactory.unregister("authentication-rate-entry");
		ComponentFactory.unregister("task-scheduler");
		ComponentFactory.unregister("platform");
	});

	it("runs the scheduled cleanup per tenant without a contextIdMissing error", async () => {
		expect(scheduledCleanup).toBeDefined();

		// The scheduler fires the cleanup with no ambient tenant context (as the background scheduler does).
		// Before the fix this rejects with ContextIdHelper.contextIdMissing (key: tenant); after the fix the
		// cleanup runs per tenant via the platform component and resolves.
		await expect((scheduledCleanup as () => Promise<void>)()).resolves.toBeUndefined();
	});
});
