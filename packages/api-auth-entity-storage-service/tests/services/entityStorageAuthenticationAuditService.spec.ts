// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { HttpContextIdKeys } from "@twin.org/api-models";
import { ContextIdKeys, ContextIdStore } from "@twin.org/context";
import { Converter, RandomHelper, Validation } from "@twin.org/core";
import { Sha256 } from "@twin.org/crypto";
import { ComparisonOperator } from "@twin.org/entity";
import {
	EntityStorageConnectorFactory,
	type IEntityStorageConnector
} from "@twin.org/entity-storage-models";
import { EntityStorageAuthenticationAuditService } from "../../src/services/entityStorageAuthenticationAuditService.js";

describe("EntityStorageAuthenticationAuditService", () => {
	let getMock: ReturnType<typeof vi.fn>;
	let queryMock: ReturnType<typeof vi.fn>;
	let setMock: ReturnType<typeof vi.fn>;
	let removeMock: ReturnType<typeof vi.fn>;
	let mockAuditEntryEntityStorage: IEntityStorageConnector;
	let service: EntityStorageAuthenticationAuditService;

	beforeEach(() => {
		vi.restoreAllMocks();

		getMock = vi.fn();
		queryMock = vi.fn();
		setMock = vi.fn();
		removeMock = vi.fn();

		mockAuditEntryEntityStorage = {
			get: getMock,
			query: queryMock,
			set: setMock,
			remove: removeMock
		} as unknown as IEntityStorageConnector;

		vi.spyOn(EntityStorageConnectorFactory, "get").mockReturnValue(mockAuditEntryEntityStorage);

		service = new EntityStorageAuthenticationAuditService();
	});

	it("should return the class name", () => {
		expect(service.className()).toBe(EntityStorageAuthenticationAuditService.CLASS_NAME);
	});

	it("should create a new audit entry", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-04-13T10:11:12.000Z"));
		vi.spyOn(RandomHelper, "generateUuidV7").mockReturnValue("audit-entry-id");
		const ipHashSalt = "StrongServerSideSaltForAuditHashing123";
		service = new EntityStorageAuthenticationAuditService({
			config: {
				ipHashSalt
			}
		});
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.User]: "user@example.com",
			[ContextIdKeys.Node]: "node-1",
			[ContextIdKeys.Organization]: "org-1",
			[ContextIdKeys.Tenant]: "tenant-1",
			[HttpContextIdKeys.IpAddress]: "127.0.0.1|10.0.0.7",
			[HttpContextIdKeys.UserAgent]: "test-agent"
		});
		const expectedIpAddressHash1 = Converter.bytesToHex(
			Sha256.sum256(Converter.utf8ToBytes(`${ipHashSalt}:127.0.0.1`))
		);
		const expectedIpAddressHash2 = Converter.bytesToHex(
			Sha256.sum256(Converter.utf8ToBytes(`${ipHashSalt}:10.0.0.7`))
		);

		const result = await service.create({
			event: "login-success",
			data: {
				meta: "audit"
			}
		});

		expect(result).toBe("audit-entry-id");
		expect(setMock).toHaveBeenCalledWith({
			id: "audit-entry-id",
			actorId: "user@example.com",
			nodeId: "node-1",
			organizationId: "org-1",
			tenantId: "tenant-1",
			dateCreated: "2026-04-13T10:11:12.000Z",
			event: "login-success",
			ipAddressHashes: [expectedIpAddressHash1, expectedIpAddressHash2],
			userAgent: "test-agent",
			correlationId: undefined,
			data: {
				meta: "audit"
			}
		});

		vi.useRealTimers();
	});

	it("should swallow create failures", async () => {
		setMock.mockRejectedValue(new Error("storage failed"));
		vi.spyOn(RandomHelper, "generateUuidV7").mockReturnValue("audit-entry-id");
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue(undefined);

		const result = await service.create({
			event: "login-failure"
		});

		expect(result).toBe("audit-entry-id");
	});

	it("should include saltEntropyTooLow validation failure for weak salt", () => {
		const asValidationErrorSpy = vi
			.spyOn(Validation, "asValidationError")
			.mockImplementation(() => {
				throw new Error("validation");
			});

		expect(
			() =>
				new EntityStorageAuthenticationAuditService({
					config: {
						ipHashSalt: "aaaaaaaa"
					}
				})
		).toThrow("validation");

		const validationFailures = asValidationErrorSpy.mock.calls[0]?.[2] as {
			reason: string;
		}[];
		expect(validationFailures.some(failure => failure.reason.endsWith("saltEntropyTooLow"))).toBe(
			true
		);
	});

	it("should use configured salt when hashing ip addresses", async () => {
		const ipHashSalt = "StrongServerSideSaltForAuditHashing123";
		service = new EntityStorageAuthenticationAuditService({
			config: {
				ipHashSalt
			}
		});

		vi.spyOn(RandomHelper, "generateUuidV7").mockReturnValue("audit-entry-id");
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[HttpContextIdKeys.IpAddress]: "203.0.113.10|198.51.100.3"
		});

		await service.create({ event: "login-success" });

		const expectedIpAddressHash1 = Converter.bytesToHex(
			Sha256.sum256(Converter.utf8ToBytes(`${ipHashSalt}:203.0.113.10`))
		);
		const expectedIpAddressHash2 = Converter.bytesToHex(
			Sha256.sum256(Converter.utf8ToBytes(`${ipHashSalt}:198.51.100.3`))
		);

		expect(setMock).toHaveBeenCalledWith(
			expect.objectContaining({
				ipAddressHashes: [expectedIpAddressHash1, expectedIpAddressHash2]
			})
		);
	});

	it("should get an audit entry by id", async () => {
		const entry = {
			id: "audit-entry-id",
			actorId: "user@example.com",
			dateCreated: "2026-04-13T10:11:12.000Z",
			event: "login-success"
		};
		getMock.mockResolvedValue(entry);

		const result = await service.get("audit-entry-id");

		expect(getMock).toHaveBeenCalledWith("audit-entry-id");
		expect(result).toEqual(entry);
	});

	it("should throw when get entry is not found", async () => {
		getMock.mockResolvedValue(undefined);

		await expect(service.get("missing-id")).rejects.toThrow();
	});

	it("should update an audit entry", async () => {
		const existing = {
			id: "audit-entry-id",
			dateCreated: "2026-04-13T10:11:12.000Z",
			event: "login-success",
			actorId: "user@example.com"
		};
		getMock.mockResolvedValue(existing);

		await service.update("audit-entry-id", { event: "login-failure" });

		expect(setMock).toHaveBeenCalledWith({
			...existing,
			event: "login-failure",
			id: "audit-entry-id",
			dateCreated: "2026-04-13T10:11:12.000Z"
		});
	});

	it("should throw when updating a non-existent entry", async () => {
		getMock.mockResolvedValue(undefined);

		await expect(service.update("missing-id", { event: "login-failure" })).rejects.toThrow();
	});

	it("should remove an audit entry", async () => {
		const existing = {
			id: "audit-entry-id",
			dateCreated: "2026-04-13T10:11:12.000Z",
			event: "login-success"
		};
		getMock.mockResolvedValue(existing);

		await service.remove("audit-entry-id");

		expect(removeMock).toHaveBeenCalledWith("audit-entry-id");
	});

	it("should throw when removing a non-existent entry", async () => {
		getMock.mockResolvedValue(undefined);

		await expect(service.remove("missing-id")).rejects.toThrow();
	});

	it("should query audit entries with filters and pagination", async () => {
		queryMock.mockResolvedValue({
			entities: [
				{
					id: "audit-entry-id",
					actorId: "user@example.com",
					dateCreated: "2026-04-13T10:11:12.000Z",
					event: "login-success",
					data: {
						ipAddress: "127.0.0.1"
					}
				}
			],
			cursor: "next-cursor"
		});

		const result = await service.query(
			{
				actorId: "user@example.com",
				event: "login-success",
				startDate: "2026-04-01T00:00:00.000Z",
				endDate: "2026-04-30T23:59:59.999Z"
			},
			"start-cursor",
			25
		);

		expect(queryMock).toHaveBeenCalledWith(
			{
				conditions: [
					{
						property: "actorId",
						value: "user@example.com",
						comparison: ComparisonOperator.Equals
					},
					{
						property: "event",
						value: "login-success",
						comparison: ComparisonOperator.Equals
					},
					{
						property: "dateCreated",
						value: "2026-04-01T00:00:00.000Z",
						comparison: ComparisonOperator.GreaterThanOrEqual
					},
					{
						property: "dateCreated",
						value: "2026-04-30T23:59:59.999Z",
						comparison: ComparisonOperator.LessThanOrEqual
					}
				]
			},
			undefined,
			undefined,
			"start-cursor",
			25
		);
		expect(result).toEqual({
			entries: [
				{
					id: "audit-entry-id",
					actorId: "user@example.com",
					dateCreated: "2026-04-13T10:11:12.000Z",
					event: "login-success",
					data: {
						ipAddress: "127.0.0.1"
					}
				}
			],
			cursor: "next-cursor"
		});
	});

	it("should query audit entries without filters", async () => {
		queryMock.mockResolvedValue({
			entities: [],
			cursor: undefined
		});

		const result = await service.query();

		expect(queryMock).toHaveBeenCalledWith(undefined, undefined, undefined, undefined, undefined);
		expect(result).toEqual({ entries: [], cursor: undefined });
	});

	it("should throw query failures", async () => {
		queryMock.mockRejectedValue(new Error("storage failed"));

		await expect(service.query()).rejects.toThrow("storage failed");
	});
});
