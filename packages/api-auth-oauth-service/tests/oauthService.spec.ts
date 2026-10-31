// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { AuthenticationProviderFactory } from "@3sixty/api-auth-models";
import type { IOAuthAuthorizationRequest } from "@3sixty/api-auth-oauth-models";
import { HttpErrorHelper } from "@3sixty/api-models";
import { ContextIdKeys, ContextIdStore } from "@3sixty/context";
import { AlreadyExistsError, ComponentFactory, Converter, NotFoundError } from "@3sixty/core";
import { Sha256 } from "@3sixty/crypto";
import { type IVaultConnector, VaultConnectorFactory } from "@3sixty/vault-models";
import { HttpStatusCode } from "@3sixty/web";
import { OAuthService } from "../src/oauthService.js";

const CALLBACK_URL = "https://node.example.com/authentication/oauth/google/callback";
const CONFIG = {
	successRedirectUrl: "https://app.example.com/",
	failureRedirectUrl: "https://app.example.com/login"
};

/**
 * Sign data with a vault key, a digest of the key name and the data stands in for the signature.
 * @param name The vault key name.
 * @param data The data to sign.
 * @returns The signature.
 */
function fakeSign(name: string, data: Uint8Array): Uint8Array {
	return Sha256.sum256(Converter.utf8ToBytes(`${name}:${Converter.bytesToHex(data)}`));
}

/**
 * Read the transaction payload kept by the browser.
 * @param transaction The signed transaction.
 * @returns The transaction.
 */
function readPayload(transaction: string): { [key: string]: string } {
	return JSON.parse(Converter.bytesToUtf8(Converter.base64UrlToBytes(transaction.split(".")[0])));
}

describe("OAuthService", () => {
	let authorizationRequests: IOAuthAuthorizationRequest[];
	let loginWithProvider: ReturnType<typeof vi.fn>;
	let service: OAuthService;
	let vault: IVaultConnector;

	beforeEach(() => {
		vi.restoreAllMocks();
		vault = {
			getKey: vi.fn(async () => ({ type: 0, publicKey: new Uint8Array(32) })),
			createKey: vi.fn(async () => new Uint8Array(32)),
			sign: vi.fn(async (name: string, data: Uint8Array) => fakeSign(name, data)),
			verify: vi.fn(
				async (name: string, data: Uint8Array, signature: Uint8Array) =>
					Converter.bytesToHex(fakeSign(name, data)) === Converter.bytesToHex(signature)
			)
		} as unknown as IVaultConnector;
		vi.spyOn(VaultConnectorFactory, "get").mockReturnValue(vault);
		vi.spyOn(ContextIdStore, "getContextIds").mockResolvedValue({
			[ContextIdKeys.Node]: "node-1"
		});
		authorizationRequests = [];
		AuthenticationProviderFactory.register("google", () => ({
			className: () => "TestGoogleConnector",
			getCapabilities: () => ({
				signInMethod: "redirect",
				passwordChange: "external",
				profileReadOnly: true
			}),
			authenticate: async () => ({ providerAccountId: "subject-1", email: "user@example.com" }),
			authorizationUrl: (request: IOAuthAuthorizationRequest) => {
				authorizationRequests.push(request);
				return `https://accounts.example.com/authorize?state=${request.state}`;
			}
		}));
		AuthenticationProviderFactory.register("entity-storage", () => ({
			className: () => "TestPasswordProvider",
			getCapabilities: () => ({
				signInMethod: "password",
				passwordChange: "api",
				profileReadOnly: false
			}),
			authenticate: async () => ({
				providerAccountId: "user@example.com",
				email: "user@example.com"
			})
		}));

		loginWithProvider = vi.fn().mockResolvedValue({ token: "jwt-token", expiry: 123 });
		const component = { className: () => "authentication", loginWithProvider };
		vi.spyOn(ComponentFactory, "get").mockReturnValue(component);
		vi.spyOn(ComponentFactory, "getIfExists").mockReturnValue(undefined);

		service = new OAuthService({ config: CONFIG });
	});

	afterEach(() => {
		AuthenticationProviderFactory.unregister("google");
		AuthenticationProviderFactory.unregister("entity-storage");
	});

	it("should require the redirect addresses", () => {
		expect(
			() => new OAuthService({ config: { successRedirectUrl: "", failureRedirectUrl: "x" } })
		).toThrow();
	});

	it("should start a PKCE sign in with fresh state, nonce and verifier", async () => {
		const first = await service.beginSignIn("google", CALLBACK_URL);
		const second = await service.beginSignIn("google", CALLBACK_URL);

		const request = authorizationRequests[0];
		expect(first.location).toBe(`https://accounts.example.com/authorize?state=${request.state}`);
		expect(request.redirectUri).toBe(CALLBACK_URL);
		expect(request.state).not.toBe(authorizationRequests[1].state);
		expect(request.nonce).not.toBe(request.state);
		expect(first.transaction).not.toBe(second.transaction);

		const transaction = readPayload(first.transaction);
		expect(transaction).toMatchObject({
			authProviderId: "google",
			state: request.state,
			nonce: request.nonce
		});
		expect(request.codeChallenge).toBe(
			Converter.bytesToBase64Url(Sha256.sum256(Converter.utf8ToBytes(transaction.codeVerifier)))
		);
	});

	it("should refuse to start with a provider that does not use OAuth as not found", async () => {
		for (const authProviderId of ["entity-storage", "unknown"]) {
			const error = await service.beginSignIn(authProviderId, CALLBACK_URL).catch(err => err);
			expect(error).toMatchObject({
				name: NotFoundError.CLASS_NAME,
				message: "oAuthService.providerNotOAuth",
				properties: { notFoundId: authProviderId, authProviderId }
			});
			expect(HttpErrorHelper.processError(error).httpStatusCode).toBe(HttpStatusCode.notFound);
		}
	});

	it("should complete a sign in and pass the code, verifier and nonce on", async () => {
		const started = await service.beginSignIn("google", CALLBACK_URL);
		const { state, nonce } = authorizationRequests[0];
		const { codeVerifier } = readPayload(started.transaction);

		const result = await service.completeSignIn(
			"google",
			CALLBACK_URL,
			{ code: "code-1", state },
			started.transaction
		);

		expect(result).toEqual({
			location: CONFIG.successRedirectUrl,
			login: { token: "jwt-token", expiry: 123 }
		});
		expect(loginWithProvider).toHaveBeenCalledWith("google", {
			code: "code-1",
			codeVerifier,
			redirectUri: CALLBACK_URL,
			nonce
		});
	});

	it("should report a cancelled sign in", async () => {
		const result = await service.completeSignIn("google", CALLBACK_URL, { error: "access_denied" });

		expect(result.location).toBe("https://app.example.com/login?error=oauthCancelled");
		expect(loginWithProvider).not.toHaveBeenCalled();
	});

	it.each([
		{ reason: "a missing transaction", callback: { code: "code-1", state: "s" }, keep: false },
		{ reason: "a different state", callback: { code: "code-1", state: "other" }, keep: true },
		{ reason: "a missing code", callback: { state: "STATE" }, keep: true },
		{ reason: "a provider error", callback: { error: "server_error", state: "STATE" }, keep: true }
	])("should fail a callback with $reason", async ({ callback, keep }) => {
		const started = await service.beginSignIn("google", CALLBACK_URL);
		const state = authorizationRequests[0].state;

		const result = await service.completeSignIn(
			"google",
			CALLBACK_URL,
			{ ...callback, state: callback.state === "STATE" ? state : callback.state },
			keep ? started.transaction : undefined
		);

		expect(result).toEqual({ location: "https://app.example.com/login?error=oauthFailed" });
		expect(loginWithProvider).not.toHaveBeenCalled();
	});

	it("should fail a callback for a different provider than the one started", async () => {
		const started = await service.beginSignIn("google", CALLBACK_URL);

		const result = await service.completeSignIn(
			"microsoft",
			CALLBACK_URL,
			{ code: "code-1", state: authorizationRequests[0].state },
			started.transaction
		);

		expect(result.location).toBe("https://app.example.com/login?error=oauthFailed");
	});

	it("should fail an expired sign in", async () => {
		const shortService = new OAuthService({ config: { ...CONFIG, transactionTtlSeconds: 1 } });
		const started = await shortService.beginSignIn("google", CALLBACK_URL);
		vi.spyOn(Date, "now").mockReturnValue(Date.now() + 2000);

		const result = await shortService.completeSignIn(
			"google",
			CALLBACK_URL,
			{ code: "code-1", state: authorizationRequests[0].state },
			started.transaction
		);

		expect(result.location).toBe("https://app.example.com/login?error=oauthFailed");
	});

	it("should fail an unreadable transaction", async () => {
		const result = await service.completeSignIn(
			"google",
			CALLBACK_URL,
			{ code: "code-1", state: "s" },
			"not-a-transaction"
		);

		expect(result.location).toBe("https://app.example.com/login?error=oauthFailed");
	});

	it("should sign the transaction with its own node key in the vault, not the session key", async () => {
		await service.beginSignIn("google", CALLBACK_URL);
		await service.beginSignIn("google", CALLBACK_URL);

		expect(vault.sign).toHaveBeenCalledWith(
			"node-1/auth-oauth-transaction",
			expect.any(Uint8Array)
		);
		expect(vault.sign).not.toHaveBeenCalledWith("node-1/auth-signing", expect.anything());
		// The key is looked up once and kept.
		expect(vault.getKey).toHaveBeenCalledTimes(1);
		expect(vault.createKey).not.toHaveBeenCalled();
	});

	it("should create the transaction key when it does not exist", async () => {
		vi.mocked(vault.getKey).mockRejectedValueOnce(new NotFoundError("vault", "keyNotFound"));

		await service.beginSignIn("google", CALLBACK_URL);

		expect(vault.createKey).toHaveBeenCalledWith("node-1/auth-oauth-transaction", 0);
	});

	it("should use the transaction key created by another request first", async () => {
		vi.mocked(vault.getKey).mockRejectedValueOnce(new NotFoundError("vault", "keyNotFound"));
		vi.mocked(vault.createKey).mockRejectedValueOnce(new AlreadyExistsError("vault", "keyExists"));

		await expect(service.beginSignIn("google", CALLBACK_URL)).resolves.toMatchObject({
			transaction: expect.any(String)
		});
	});

	it("should sign with the configured transaction key", async () => {
		service = new OAuthService({
			config: { ...CONFIG, transactionSigningKeyName: "auth-signing" }
		});

		await service.beginSignIn("google", CALLBACK_URL);

		expect(vault.sign).toHaveBeenCalledWith("node-1/auth-signing", expect.any(Uint8Array));
	});

	it("should complete a sign in started before the update with the session key", async () => {
		const started = await service.beginSignIn("google", CALLBACK_URL);
		const [payload] = started.transaction.split(".");
		const legacySignature = fakeSign("node-1/auth-signing", Converter.utf8ToBytes(payload));

		const result = await service.completeSignIn(
			"google",
			CALLBACK_URL,
			{ code: "code-1", state: authorizationRequests[0].state },
			`${payload}.${Converter.bytesToBase64Url(legacySignature)}`
		);

		expect(result.location).toBe(CONFIG.successRedirectUrl);
	});

	it.each([
		{
			reason: "a changed transaction",
			change: (transaction: string, state: string): string => {
				const [, signature] = transaction.split(".");
				const payload = { ...readPayload(transaction), state, codeVerifier: "attacker" };
				return `${Converter.bytesToBase64Url(Converter.utf8ToBytes(JSON.stringify(payload)))}.${signature}`;
			}
		},
		{
			reason: "an unsigned transaction",
			change: (transaction: string): string => transaction.split(".")[0]
		},
		{
			reason: "a transaction signed with another key",
			change: (transaction: string): string => {
				const [payload] = transaction.split(".");
				const signature = fakeSign("other/auth-signing", Converter.utf8ToBytes(payload));
				return `${payload}.${Converter.bytesToBase64Url(signature)}`;
			}
		}
	])("should fail $reason", async ({ change }) => {
		const started = await service.beginSignIn("google", CALLBACK_URL);
		const state = authorizationRequests[0].state;

		const result = await service.completeSignIn(
			"google",
			CALLBACK_URL,
			{ code: "code-1", state },
			change(started.transaction, state)
		);

		expect(result.location).toBe("https://app.example.com/login?error=oauthFailed");
		expect(loginWithProvider).not.toHaveBeenCalled();
	});

	it("should fail when the login is rejected", async () => {
		loginWithProvider.mockRejectedValue(new Error("rejected"));
		const started = await service.beginSignIn("google", CALLBACK_URL);

		const result = await service.completeSignIn(
			"google",
			CALLBACK_URL,
			{ code: "code-1", state: authorizationRequests[0].state },
			started.transaction
		);

		expect(result).toEqual({ location: "https://app.example.com/login?error=oauthFailed" });
	});
});
