// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import {
	type AuthenticationAuthorizationCode,
	type AuthenticationUser,
	AuthorizationCodeHelper,
	initSchema
} from "@3sixty/api-auth-entity-storage-service";
import { Converter, GuardError, UnauthorizedError } from "@3sixty/core";
import { Sha256 } from "@3sixty/crypto";
import { MemoryEntityStorageConnector } from "@3sixty/entity-storage-connector-memory";
import { EntityStorageConnectorFactory } from "@3sixty/entity-storage-models";
import { nameof } from "@3sixty/nameof";
import { EntityStorageOAuthProviderConnector } from "../src/entityStorageOAuthProviderConnector.js";

initSchema();

const REDIRECT_URI = "https://node.example.com/authentication/oauth/3sixty-oauth/callback";
const CODE_VERIFIER = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
const CODE_CHALLENGE = Converter.bytesToBase64Url(
	Sha256.sum256(Converter.utf8ToBytes(CODE_VERIFIER))
);

describe("EntityStorageOAuthProviderConnector", () => {
	let userEntityStorage: MemoryEntityStorageConnector<AuthenticationUser>;
	let codeEntityStorage: MemoryEntityStorageConnector<AuthenticationAuthorizationCode>;
	let connector: EntityStorageOAuthProviderConnector;

	/**
	 * Issue a code for the account.
	 * @param accountId The account id.
	 * @param expirySeconds How long the code can be used for.
	 * @returns The code.
	 */
	async function issueCode(accountId = "account-1", expirySeconds = 60): Promise<string> {
		return AuthorizationCodeHelper.create(
			codeEntityStorage,
			accountId,
			{
				state: "state-1",
				nonce: "nonce-1",
				codeChallenge: CODE_CHALLENGE,
				codeChallengeMethod: "S256",
				redirectUri: REDIRECT_URI
			},
			expirySeconds
		);
	}

	beforeEach(async () => {
		userEntityStorage = new MemoryEntityStorageConnector<AuthenticationUser>({
			entitySchema: nameof<AuthenticationUser>(),
			config: { storageKey: "authentication-user-oauth-connector" }
		});
		codeEntityStorage = new MemoryEntityStorageConnector<AuthenticationAuthorizationCode>({
			entitySchema: nameof<AuthenticationAuthorizationCode>(),
			config: { storageKey: "authentication-authorization-code-connector" }
		});
		vi.spyOn(EntityStorageConnectorFactory, "get").mockImplementation(
			name =>
				(name === "authentication-authorization-code"
					? codeEntityStorage
					: userEntityStorage) as unknown as ReturnType<typeof EntityStorageConnectorFactory.get>
		);

		await userEntityStorage.set({
			accountId: "account-1",
			email: "user@example.com",
			authProviderId: "3sixty",
			providerAccountId: "user@example.com",
			dateCreated: "2026-01-01T00:00:00.000Z",
			dateModified: "2026-01-01T00:00:00.000Z"
		});
		await userEntityStorage.set({
			accountId: "account-2",
			email: "user@example.com",
			authProviderId: "google",
			providerAccountId: "google-subject",
			dateCreated: "2026-01-01T00:00:00.000Z",
			dateModified: "2026-01-01T00:00:00.000Z"
		});

		connector = new EntityStorageOAuthProviderConnector({
			config: { loginPageUrl: "https://app.example.com/login" }
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should require the login page address", () => {
		expect(
			() =>
				new EntityStorageOAuthProviderConnector({
					config: {} as unknown as { loginPageUrl: string }
				})
		).toThrow(GuardError);
	});

	it("should be an OAuth 2.0 provider with a password form", () => {
		expect(EntityStorageOAuthProviderConnector.NAMESPACE).toBe("3sixty-oauth");
		expect(connector.className()).toBe(EntityStorageOAuthProviderConnector.CLASS_NAME);
		expect(connector.getCapabilities()).toEqual({
			type: "oauth2",
			signInMethod: "password",
			passwordChange: "api",
			profileReadOnly: false
		});
	});

	it("should send the browser to the login page with the authorization request", () => {
		const url = new URL(
			connector.authorizationUrl({
				state: "state-1",
				nonce: "nonce-1",
				codeChallenge: CODE_CHALLENGE,
				redirectUri: REDIRECT_URI
			})
		);

		expect(`${url.origin}${url.pathname}`).toBe("https://app.example.com/login");
		expect([...url.searchParams.entries()]).toEqual([
			["response_type", "code"],
			["redirect_uri", REDIRECT_URI],
			["state", "state-1"],
			["nonce", "nonce-1"],
			["code_challenge", CODE_CHALLENGE],
			["code_challenge_method", "S256"]
		]);
	});

	it("should redeem a code for the password account once", async () => {
		const code = await issueCode();
		const exchange = {
			code,
			codeVerifier: CODE_VERIFIER,
			redirectUri: REDIRECT_URI,
			nonce: "nonce-1"
		};

		await expect(connector.authenticate(exchange)).resolves.toEqual({
			providerAccountId: "user@example.com",
			accountId: "account-1",
			email: "user@example.com"
		});
		await expect(connector.authenticate(exchange)).rejects.toThrow(UnauthorizedError);
	});

	it.each([
		{
			field: "code verifier",
			change: { codeVerifier: "another-verifier-another-verifier-another" }
		},
		{ field: "redirect address", change: { redirectUri: "https://evil.example.com/callback" } },
		{ field: "nonce", change: { nonce: "nonce-2" } },
		{ field: "code", change: { code: "unknown-code" } }
	])("should refuse a code with another $field", async ({ change }) => {
		const code = await issueCode();

		await expect(
			connector.authenticate({
				code,
				codeVerifier: CODE_VERIFIER,
				redirectUri: REDIRECT_URI,
				nonce: "nonce-1",
				...change
			})
		).rejects.toThrow(UnauthorizedError);
	});

	it("should refuse an expired code", async () => {
		const code = await issueCode("account-1", 0);

		await expect(
			connector.authenticate({
				code,
				codeVerifier: CODE_VERIFIER,
				redirectUri: REDIRECT_URI,
				nonce: "nonce-1"
			})
		).rejects.toThrow(UnauthorizedError);
	});

	it("should refuse a code for an account that is not a password account", async () => {
		const code = await issueCode("account-2");

		await expect(
			connector.authenticate({
				code,
				codeVerifier: CODE_VERIFIER,
				redirectUri: REDIRECT_URI,
				nonce: "nonce-1"
			})
		).rejects.toThrow(UnauthorizedError);
	});

	it("should refuse a code for a removed account", async () => {
		const code = await issueCode();
		await userEntityStorage.remove("account-1");

		await expect(
			connector.authenticate({
				code,
				codeVerifier: CODE_VERIFIER,
				redirectUri: REDIRECT_URI,
				nonce: "nonce-1"
			})
		).rejects.toThrow(UnauthorizedError);
	});
});
