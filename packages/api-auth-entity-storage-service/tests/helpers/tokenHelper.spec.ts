// Copyright 2024 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { UnauthorizedError } from "@3sixty/core";
import type { IVaultConnector } from "@3sixty/vault-models";
import { HeaderTypes, type IHttpHeaders, Jwt } from "@3sixty/web";
import { TokenHelper } from "../../src/utils/tokenHelper.js";

describe("TokenHelper.createToken", () => {
	const nodeId = "test-node";
	const signingKeyName = "signing-key";

	it("should set iss to nodeId and kid to signingKeyName in the token", async () => {
		const mockVaultConnector = {
			get: vi.fn(),
			set: vi.fn(),
			remove: vi.fn()
		} as unknown as IVaultConnector;

		let capturedHeader: { [key: string]: unknown } | undefined;
		let capturedPayload: { [key: string]: unknown } | undefined;
		vi.spyOn(Jwt, "encodeWithSigner").mockImplementation(async (header, payload) => {
			capturedHeader = header as { [key: string]: unknown };
			capturedPayload = payload as { [key: string]: unknown };
			return "mock.jwt.token";
		});

		await TokenHelper.createToken(
			mockVaultConnector,
			nodeId,
			signingKeyName,
			"did:user:123",
			undefined,
			60
		);

		expect(capturedHeader?.kid).toBe(signingKeyName);
		expect(capturedPayload?.iss).toBe(nodeId);
		expect(capturedPayload).not.toHaveProperty("org");
	});

	it("should store the plain tenant ID directly in the jwt tid claim", async () => {
		const tenantId = "my-tenant";

		const mockVaultConnector = {
			get: vi.fn(),
			set: vi.fn(),
			remove: vi.fn()
		} as unknown as IVaultConnector;

		let capturedPayload: { [key: string]: unknown } | undefined;
		vi.spyOn(Jwt, "encodeWithSigner").mockImplementation(async (header, payload) => {
			capturedPayload = payload as { [key: string]: unknown };
			return "mock.jwt.token";
		});

		await TokenHelper.createToken(
			mockVaultConnector,
			nodeId,
			signingKeyName,
			"did:user:123",
			tenantId,
			60
		);

		expect(capturedPayload?.tid).toBe(tenantId);
	});

	it("should set tid to undefined when no tenant ID is provided", async () => {
		const mockVaultConnector = {
			get: vi.fn(),
			set: vi.fn(),
			remove: vi.fn()
		} as unknown as IVaultConnector;

		let capturedPayload: { [key: string]: unknown } | undefined;
		vi.spyOn(Jwt, "encodeWithSigner").mockImplementation(async (header, payload) => {
			capturedPayload = payload as { [key: string]: unknown };
			return "mock.jwt.token";
		});

		await TokenHelper.createToken(
			mockVaultConnector,
			nodeId,
			signingKeyName,
			"did:user:123",
			undefined,
			60
		);

		expect(capturedPayload?.tid).toBeUndefined();
	});
});

describe("TokenHelper.createToken session", () => {
	it("should carry the session start and not expire beyond the maximum session length", async () => {
		let capturedPayload: { [key: string]: unknown } | undefined;
		vi.spyOn(Jwt, "encodeWithSigner").mockImplementation(async (header, payload) => {
			capturedPayload = payload as { [key: string]: unknown };
			return "mock.jwt.token";
		});
		const nowSeconds = Math.trunc(Date.now() / 1000);
		const fiftyMinutes = 3000;
		const oneHour = 3600;
		const sessionStart = nowSeconds - fiftyMinutes;
		const sessionEnd = sessionStart + oneHour;

		const result = await TokenHelper.createToken(
			{} as unknown as IVaultConnector,
			"test-node",
			"signing-key",
			"account-1",
			undefined,
			60,
			0,
			sessionStart,
			60
		);

		expect(capturedPayload?.sst).toBe(sessionStart);
		expect(Math.abs(Number(capturedPayload?.exp) - sessionEnd)).toBeLessThanOrEqual(1);
		const sessionEndMs = sessionEnd * 1000;
		expect(Math.abs(result.expiry - sessionEndMs)).toBeLessThanOrEqual(1000);
	});

	it("should start the session now when no start is given", async () => {
		let capturedPayload: { [key: string]: unknown } | undefined;
		vi.spyOn(Jwt, "encodeWithSigner").mockImplementation(async (header, payload) => {
			capturedPayload = payload as { [key: string]: unknown };
			return "mock.jwt.token";
		});

		await TokenHelper.createToken(
			{} as unknown as IVaultConnector,
			"test-node",
			"signing-key",
			"account-1",
			undefined,
			60
		);

		const nowSeconds = Date.now() / 1000;
		expect(Math.abs(Number(capturedPayload?.sst) - nowSeconds)).toBeLessThanOrEqual(2);
	});

	it("should leave the session start out when it is not known", async () => {
		let capturedPayload: { [key: string]: unknown } | undefined;
		vi.spyOn(Jwt, "encodeWithSigner").mockImplementation(async (header, payload) => {
			capturedPayload = payload as { [key: string]: unknown };
			return "mock.jwt.token";
		});

		const result = await TokenHelper.createToken(
			{} as unknown as IVaultConnector,
			"test-node",
			"signing-key",
			"account-1",
			undefined,
			60,
			0,
			null
		);

		expect(capturedPayload?.sst).toBeUndefined();
		expect(Math.abs(result.expiry - (Date.now() + 3600000))).toBeLessThanOrEqual(2000);
	});
});

describe("TokenHelper", () => {
	it("should extract token from valid Authorization header", () => {
		const headers = { [HeaderTypes.Authorization]: "Bearer mytoken123" };
		const result = TokenHelper.extractTokenFromHeaders(headers);
		expect(result).toEqual({ token: "mytoken123", location: "authorization" });
	});

	it("should return undefined if Authorization header is missing", () => {
		const headers = {};
		const token = TokenHelper.extractTokenFromHeaders(headers);
		expect(token).toBeUndefined();
	});

	it("should return undefined if Authorization header is not Bearer", () => {
		const headers = { [HeaderTypes.Authorization]: "Basic abcdef" };
		const token = TokenHelper.extractTokenFromHeaders(headers);
		expect(token).toBeUndefined();
	});

	it("should return undefined if Authorization header is malformed", () => {
		const headers = { [HeaderTypes.Authorization]: "Bearer" };
		const token = TokenHelper.extractTokenFromHeaders(headers);
		expect(token).toBeUndefined();
	});

	it("should handle lowercase authorization header", () => {
		const headers = { [HeaderTypes.Authorization]: "Bearer tokenXYZ" };
		const result = TokenHelper.extractTokenFromHeaders(headers);
		expect(result).toEqual({ token: "tokenXYZ", location: "authorization" });
	});

	it("should trim token value", () => {
		const headers = { [HeaderTypes.Authorization]: "Bearer   spacedtoken   " };
		const result = TokenHelper.extractTokenFromHeaders(headers);
		expect(result).toEqual({ token: "spacedtoken", location: "authorization" });
	});

	it("should extract token from cookie header", () => {
		const headers = { [HeaderTypes.Cookie]: "token=mycookie123" };
		const result = TokenHelper.extractTokenFromHeaders(headers, "token");
		expect(result).toEqual({ token: "mycookie123", location: "cookie" });
	});

	it("should extract token from cookie header with multiple cookies", () => {
		const headers = { [HeaderTypes.Cookie]: "foo=bar; token=multiToken; session=abc" };
		const result = TokenHelper.extractTokenFromHeaders(headers, "token");
		expect(result).toEqual({ token: "multiToken", location: "cookie" });
	});

	it("should return undefined if cookie header does not contain token", () => {
		const headers = { [HeaderTypes.Cookie]: "foo=bar; session=abc" };
		const result = TokenHelper.extractTokenFromHeaders(headers, "token");
		expect(result).toBeUndefined();
	});

	it("should return undefined if cookie header is empty", () => {
		const headers = { [HeaderTypes.Cookie]: "" };
		const result = TokenHelper.extractTokenFromHeaders(headers, "token");
		expect(result).toBeUndefined();
	});

	it("should extract token with custom cookie name", () => {
		const headers = { [HeaderTypes.Cookie]: "customToken=abc123" };
		const result = TokenHelper.extractTokenFromHeaders(headers, "customToken");
		expect(result).toEqual({ token: "abc123", location: "cookie" });
	});

	it("should trim token value from cookie", () => {
		const headers = { [HeaderTypes.Cookie]: "token=   spacedcookie   " };
		const result = TokenHelper.extractTokenFromHeaders(headers, "token");
		expect(result).toEqual({ token: "spacedcookie", location: "cookie" });
	});

	it("should extract from a real headers object", () => {
		const headers: IHttpHeaders = {
			"access-control-allow-credentials": "true",
			"access-control-expose-headers": "content-disposition, location",
			"content-type": "application/json; charset=utf-8",
			cookie:
				"access_token=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg1MTdjN2Q3MjBjOTBlYWRlMmRmMzZkYWZjZjIxMzgzMThiMGViYjgwMzgyYTNhM2MwZDdlYjZmMzBjYmM5YjVlIiwib3JnIjoiZGlkOmVudGl0eS1zdG9yYWdlOjB4ODgwNjZiYzc2YmIxNGViMmQ3ZDc1ZjE4NTg0NWMzZTMxMTVlOGQ3OWVlN2I4NmE3OTYzYWVmM2ViNTg3MjY4MyIsImV4cCI6MTc2NzU5MTQ3OH0.wuQkxGHAe-qTfl1OzMlRi4WzoYG5pi6EV76xoSzHPVmuVT4W3XaS8aauEeMfIZd-DDBMsCcsVgcQwSxMOtqNBg; value2=bob"
		};

		const result = TokenHelper.extractTokenFromHeaders(headers, "access_token");
		expect(result).toEqual({
			token:
				"eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZW50aXR5LXN0b3JhZ2U6MHg1MTdjN2Q3MjBjOTBlYWRlMmRmMzZkYWZjZjIxMzgzMThiMGViYjgwMzgyYTNhM2MwZDdlYjZmMzBjYmM5YjVlIiwib3JnIjoiZGlkOmVudGl0eS1zdG9yYWdlOjB4ODgwNjZiYzc2YmIxNGViMmQ3ZDc1ZjE4NTg0NWMzZTMxMTVlOGQ3OWVlN2I4NmE3OTYzYWVmM2ViNTg3MjY4MyIsImV4cCI6MTc2NzU5MTQ3OH0.wuQkxGHAe-qTfl1OzMlRi4WzoYG5pi6EV76xoSzHPVmuVT4W3XaS8aauEeMfIZd-DDBMsCcsVgcQwSxMOtqNBg",
			location: "cookie"
		});
	});

	describe("verify token validation", () => {
		const mockVaultConnector: IVaultConnector = {
			get: vi.fn(),
			set: vi.fn(),
			remove: vi.fn()
		} as unknown as IVaultConnector;

		const nodeId = "test-node";
		const signingKeyName = "test-key";

		it("should verify a valid token with all required fields", async () => {
			const payload = {
				iss: nodeId,
				sub: "user123",
				exp: Math.trunc(Date.now() / 1000) + 3600
			};

			const token = "valid.jwt.token";
			vi.spyOn(Jwt, "verifyWithVerifier").mockResolvedValue({
				header: { alg: "EdDSA", kid: signingKeyName },
				payload
			});

			const result = await TokenHelper.verify(mockVaultConnector, nodeId, signingKeyName, token);

			expect(result.payload).toEqual(payload);
			expect(result.header).toEqual({ alg: "EdDSA", kid: signingKeyName });
		});

		it("should throw UnauthorizedError when header kid does not match signingKeyName", async () => {
			const payload = {
				iss: nodeId,
				sub: "user123",
				exp: Math.trunc(Date.now() / 1000) + 3600
			};

			const token = "wrong-kid.jwt.token";
			vi.spyOn(Jwt, "verifyWithVerifier").mockResolvedValue({
				header: { alg: "EdDSA", kid: "different-key" },
				payload
			});

			await expect(
				TokenHelper.verify(mockVaultConnector, nodeId, signingKeyName, token)
			).rejects.toThrow(UnauthorizedError);
		});

		it("should throw UnauthorizedError when payload iss does not match nodeId", async () => {
			const payload = {
				iss: "different-node",
				sub: "user123",
				exp: Math.trunc(Date.now() / 1000) + 3600
			};

			const token = "wrong-iss.jwt.token";
			vi.spyOn(Jwt, "verifyWithVerifier").mockResolvedValue({
				header: { alg: "EdDSA", kid: signingKeyName },
				payload
			});

			await expect(
				TokenHelper.verify(mockVaultConnector, nodeId, signingKeyName, token)
			).rejects.toThrow(UnauthorizedError);
		});

		it("should throw UnauthorizedError when the token has no expiry", async () => {
			const payload = {
				iss: nodeId,
				sub: "user123"
			};

			const token = "no-exp.jwt.token";
			vi.spyOn(Jwt, "verifyWithVerifier").mockResolvedValue({
				header: { alg: "EdDSA", kid: signingKeyName },
				payload
			});

			await expect(
				TokenHelper.verify(mockVaultConnector, nodeId, signingKeyName, token)
			).rejects.toMatchObject({
				name: "UnauthorizedError",
				message: "tokenHelper.payloadMissingExpiry"
			});
		});

		it("should throw UnauthorizedError when token is expired", async () => {
			const payload = {
				iss: nodeId,
				sub: "user123",
				exp: Math.trunc(Date.now() / 1000) - 3600 // Expired 1 hour ago
			};

			const token = "expired.jwt.token";
			vi.spyOn(Jwt, "verifyWithVerifier").mockResolvedValue({
				header: { alg: "EdDSA", kid: signingKeyName },
				payload
			});

			await expect(
				TokenHelper.verify(mockVaultConnector, nodeId, signingKeyName, token)
			).rejects.toThrow(UnauthorizedError);
		});

		it("should throw UnauthorizedError when subject is missing", async () => {
			const payload = {
				iss: nodeId,
				exp: Math.trunc(Date.now() / 1000) + 3600
			};

			const token = "no-subject.jwt.token";
			vi.spyOn(Jwt, "verifyWithVerifier").mockResolvedValue({
				header: { alg: "EdDSA", kid: signingKeyName },
				payload
			});

			await expect(
				TokenHelper.verify(mockVaultConnector, nodeId, signingKeyName, token)
			).rejects.toThrow(UnauthorizedError);
		});

		it("should throw UnauthorizedError when subject is empty string", async () => {
			const payload = {
				iss: nodeId,
				sub: "",
				exp: Math.trunc(Date.now() / 1000) + 3600
			};

			const token = "empty-subject.jwt.token";
			vi.spyOn(Jwt, "verifyWithVerifier").mockResolvedValue({
				header: { alg: "EdDSA", kid: signingKeyName },
				payload
			});

			await expect(
				TokenHelper.verify(mockVaultConnector, nodeId, signingKeyName, token)
			).rejects.toThrow(UnauthorizedError);
		});

		it("should verify a token without an organization claim", async () => {
			const payload = {
				iss: nodeId,
				sub: "user123",
				exp: Math.trunc(Date.now() / 1000) + 3600
			};

			const token = "no-org.jwt.token";
			vi.spyOn(Jwt, "verifyWithVerifier").mockResolvedValue({
				header: { alg: "EdDSA", kid: signingKeyName },
				payload
			});

			await expect(
				TokenHelper.verify(mockVaultConnector, nodeId, signingKeyName, token)
			).resolves.toEqual({ header: { alg: "EdDSA", kid: signingKeyName }, payload });
		});

		it("should verify token with tenant ID", async () => {
			const payload = {
				iss: nodeId,
				sub: "user123",
				tid: "tenant789",
				exp: Math.trunc(Date.now() / 1000) + 3600
			};

			const token = "with-tenant.jwt.token";
			vi.spyOn(Jwt, "verifyWithVerifier").mockResolvedValue({
				header: { alg: "EdDSA", kid: signingKeyName },
				payload
			});

			const result = await TokenHelper.verify(mockVaultConnector, nodeId, signingKeyName, token);

			expect(result.payload).toEqual(payload);
		});

		it("should verify token with additional custom claims", async () => {
			const payload = {
				iss: nodeId,
				sub: "user123",
				exp: Math.trunc(Date.now() / 1000) + 3600,
				customClaim: "customValue"
			};

			const token = "custom-claims.jwt.token";
			vi.spyOn(Jwt, "verifyWithVerifier").mockResolvedValue({
				header: { alg: "EdDSA", kid: signingKeyName },
				payload
			});

			const result = await TokenHelper.verify(mockVaultConnector, nodeId, signingKeyName, token);

			expect(result.payload).toEqual(payload);
		});

		it("should throw UnauthorizedError when token is exactly at expiry time", async () => {
			const now = Math.trunc(Date.now() / 1000);
			const payload = {
				iss: nodeId,
				sub: "user123",
				exp: now - 1 // Expired just now
			};

			const token = "just-expired.jwt.token";
			vi.spyOn(Jwt, "verifyWithVerifier").mockResolvedValue({
				header: { alg: "EdDSA", kid: signingKeyName },
				payload
			});

			await expect(
				TokenHelper.verify(mockVaultConnector, nodeId, signingKeyName, token)
			).rejects.toThrow(UnauthorizedError);
		});
	});

	describe("verify user validation", () => {
		const mockVaultConnector: IVaultConnector = {
			get: vi.fn(),
			set: vi.fn(),
			remove: vi.fn()
		} as unknown as IVaultConnector;

		const nodeId = "test-node";
		const signingKeyName = "test-key";

		it("should verify token when verifyUser confirms user and tenant", async () => {
			const payload = {
				iss: nodeId,
				sub: "user123",
				exp: Math.trunc(Date.now() / 1000) + 3600
			};

			const token = "verified-user.jwt.token";
			const verifyUser = vi.fn().mockResolvedValue(["user", "tenant"]);
			vi.spyOn(Jwt, "verifyWithVerifier").mockResolvedValue({
				header: { alg: "EdDSA", kid: signingKeyName },
				payload
			});

			const result = await TokenHelper.verify(
				mockVaultConnector,
				nodeId,
				signingKeyName,
				token,
				verifyUser
			);

			expect(result.payload).toEqual(payload);
			expect(verifyUser).toHaveBeenCalledWith("user123", undefined, undefined);
		});

		it("should pass pver as a number to verifyUser when present in token payload", async () => {
			const payload = {
				iss: nodeId,
				sub: "user123",
				pver: 3,
				exp: Math.trunc(Date.now() / 1000) + 3600
			};

			const token = "token-with-pver.jwt.token";
			const verifyUser = vi.fn().mockResolvedValue(["user", "tenant"]);
			vi.spyOn(Jwt, "verifyWithVerifier").mockResolvedValue({
				header: { alg: "EdDSA", kid: signingKeyName },
				payload
			});

			const result = await TokenHelper.verify(
				mockVaultConnector,
				nodeId,
				signingKeyName,
				token,
				verifyUser
			);

			expect(result.payload).toEqual(payload);
			expect(verifyUser).toHaveBeenCalledWith("user123", undefined, 3);
		});

		it("should pass undefined to verifyUser when pver is absent from token payload", async () => {
			const payload = {
				iss: nodeId,
				sub: "user123",
				exp: Math.trunc(Date.now() / 1000) + 3600
			};

			const token = "token-without-pver.jwt.token";
			const verifyUser = vi.fn().mockResolvedValue(["user", "tenant"]);
			vi.spyOn(Jwt, "verifyWithVerifier").mockResolvedValue({
				header: { alg: "EdDSA", kid: signingKeyName },
				payload
			});

			await TokenHelper.verify(mockVaultConnector, nodeId, signingKeyName, token, verifyUser);

			expect(verifyUser).toHaveBeenCalledWith("user123", undefined, undefined);
		});

		it("should throw UnauthorizedError when verifyUser does not confirm the user", async () => {
			const payload = {
				iss: nodeId,
				sub: "user123",
				exp: Math.trunc(Date.now() / 1000) + 3600
			};

			const token = "missing-user-verification.jwt.token";
			const verifyUser = vi.fn().mockResolvedValue(["tenant"]);
			vi.spyOn(Jwt, "verifyWithVerifier").mockResolvedValue({
				header: { alg: "EdDSA", kid: signingKeyName },
				payload
			});

			await expect(
				TokenHelper.verify(mockVaultConnector, nodeId, signingKeyName, token, verifyUser)
			).rejects.toThrow(UnauthorizedError);
		});

		it("should throw UnauthorizedError when verifyUser does not confirm the tenant", async () => {
			const payload = {
				iss: nodeId,
				sub: "user123",
				tid: "tenant-xyz",
				exp: Math.trunc(Date.now() / 1000) + 3600
			};

			const token = "missing-tenant-verification.jwt.token";
			const verifyUser = vi.fn().mockResolvedValue(["user"]);
			vi.spyOn(Jwt, "verifyWithVerifier").mockResolvedValue({
				header: { alg: "EdDSA", kid: signingKeyName },
				payload
			});

			await expect(
				TokenHelper.verify(mockVaultConnector, nodeId, signingKeyName, token, verifyUser)
			).rejects.toThrow(UnauthorizedError);
		});

		it("should pass the tid claim from the token payload to verifyUser", async () => {
			const tenantId = "some-tenant-value";
			const payload = {
				iss: nodeId,
				sub: "user123",
				tid: tenantId,
				exp: Math.trunc(Date.now() / 1000) + 3600
			};

			const token = "with-tenant.jwt.token";
			const verifyUser = vi.fn().mockResolvedValue(["user", "tenant"]);
			vi.spyOn(Jwt, "verifyWithVerifier").mockResolvedValue({
				header: { alg: "EdDSA", kid: signingKeyName },
				payload
			});

			await TokenHelper.verify(mockVaultConnector, nodeId, signingKeyName, token, verifyUser);

			expect(verifyUser).toHaveBeenCalledWith("user123", tenantId, undefined);
		});

		it("should pass undefined tid to verifyUser when tid is absent from token payload", async () => {
			const payload = {
				iss: nodeId,
				sub: "user123",
				exp: Math.trunc(Date.now() / 1000) + 3600
			};

			const token = "without-tenant.jwt.token";
			const verifyUser = vi.fn().mockResolvedValue(["user", "tenant"]);
			vi.spyOn(Jwt, "verifyWithVerifier").mockResolvedValue({
				header: { alg: "EdDSA", kid: signingKeyName },
				payload
			});

			await TokenHelper.verify(mockVaultConnector, nodeId, signingKeyName, token, verifyUser);

			expect(verifyUser).toHaveBeenCalledWith("user123", undefined, undefined);
		});
	});
});
