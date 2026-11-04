// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { Converter, DurationConstants, UnauthorizedError } from "@3sixty/core";
import { FetchHelper, type IJwk, type IJwtPayload, Jwt } from "@3sixty/web";
import { OidcHelper } from "../../src/helpers/oidcHelper.js";
import type { IOidcIdTokenOptions } from "../../src/models/IOidcIdTokenOptions.js";

const ISSUER = "https://issuer.example.com";
const CLIENT_ID = "client-1";
const NONCE = "nonce-1";
const KID = "key-1";

describe("OidcHelper", () => {
	let privateKey: CryptoKey;
	let publicJwk: IJwk;
	let options: IOidcIdTokenOptions;

	beforeAll(async () => {
		const keyPair = await crypto.subtle.generateKey(
			{
				name: "RSASSA-PKCS1-v1_5",
				modulusLength: 2048,
				publicExponent: new Uint8Array([1, 0, 1]),
				hash: "SHA-256"
			},
			true,
			["sign", "verify"]
		);
		privateKey = keyPair.privateKey;
		publicJwk = {
			...((await crypto.subtle.exportKey("jwk", keyPair.publicKey)) as IJwk),
			kid: KID,
			alg: "RS256"
		};
	});

	beforeEach(() => {
		vi.restoreAllMocks();
		vi.spyOn(FetchHelper, "fetchJson").mockResolvedValue({ keys: [publicJwk] });
		options = {
			jwksUri: "https://issuer.example.com/keys",
			audience: CLIENT_ID,
			nonce: NONCE,
			isIssuer: issuer => issuer === ISSUER
		};
	});

	/**
	 * Sign an ID token with the test key.
	 * @param overrides Claims to change.
	 * @param kid The key id to put in the header.
	 * @returns The ID token.
	 */
	async function signIdToken(overrides: IJwtPayload = {}, kid: string = KID): Promise<string> {
		return Jwt.encode(
			{ alg: "RS256", kid },
			{
				iss: ISSUER,
				aud: CLIENT_ID,
				sub: "subject-1",
				nonce: NONCE,
				exp: Math.trunc(Date.now() / DurationConstants.MsPerSecond) + 300,
				email: "user@example.com",
				[OidcHelper.CLAIM_GIVEN_NAME]: "Ada",
				[OidcHelper.CLAIM_FAMILY_NAME]: "Lovelace",
				...overrides
			},
			privateKey
		);
	}

	describe("authorizationUrl", () => {
		it("should build a PKCE authorization request", () => {
			const url = new URL(
				OidcHelper.authorizationUrl(
					"https://issuer.example.com/authorize",
					{ clientId: CLIENT_ID, clientSecret: "secret" },
					{
						state: "state-1",
						nonce: NONCE,
						codeChallenge: "challenge-1",
						redirectUri: "https://node.example.com/callback"
					}
				)
			);

			expect(url.origin + url.pathname).toBe("https://issuer.example.com/authorize");
			expect([...url.searchParams]).toEqual([
				["response_type", "code"],
				["client_id", CLIENT_ID],
				["redirect_uri", "https://node.example.com/callback"],
				["scope", "openid email profile"],
				["state", "state-1"],
				["nonce", NONCE],
				["code_challenge", "challenge-1"],
				["code_challenge_method", "S256"],
				["prompt", "select_account"]
			]);
		});
	});

	describe("exchangeCode", () => {
		const exchange = {
			code: "code-1",
			codeVerifier: "verifier-1",
			redirectUri: "https://node.example.com/callback",
			nonce: NONCE
		};

		it("should post the code and verifier and return the ID token", async () => {
			const fetchSpy = vi
				.spyOn(FetchHelper, "fetch")
				.mockResolvedValue(
					new Response(JSON.stringify({ [OidcHelper.TOKEN_RESPONSE_ID_TOKEN]: "id-token-1" }))
				);

			const idToken = await OidcHelper.exchangeCode(
				"https://issuer.example.com/token",
				{ clientId: CLIENT_ID, clientSecret: "secret" },
				exchange
			);

			expect(idToken).toBe("id-token-1");
			const [, url, method, body] = fetchSpy.mock.calls[0];
			expect(url).toBe("https://issuer.example.com/token");
			expect(method).toBe("POST");
			expect([...new URLSearchParams(body as string)]).toEqual([
				["grant_type", "authorization_code"],
				["code", "code-1"],
				["code_verifier", "verifier-1"],
				["redirect_uri", "https://node.example.com/callback"],
				["client_id", CLIENT_ID],
				["client_secret", "secret"]
			]);
		});

		it("should also return the access token issued with the ID token", async () => {
			const config = { clientId: CLIENT_ID, clientSecret: "secret" };
			vi.spyOn(FetchHelper, "fetch").mockImplementation(
				async () =>
					new Response(
						JSON.stringify({
							[OidcHelper.TOKEN_RESPONSE_ID_TOKEN]: "id-token-1",
							[OidcHelper.TOKEN_RESPONSE_ACCESS_TOKEN]: "access-token-1"
						})
					)
			);

			await expect(
				OidcHelper.exchangeCodeForTokens("https://issuer.example.com/token", config, exchange)
			).resolves.toEqual({ idToken: "id-token-1", accessToken: "access-token-1" });
			await expect(
				OidcHelper.exchangeCode("https://issuer.example.com/token", config, exchange)
			).resolves.toBe("id-token-1");

			vi.spyOn(FetchHelper, "fetch").mockResolvedValue(
				new Response(JSON.stringify({ [OidcHelper.TOKEN_RESPONSE_ID_TOKEN]: "id-token-1" }))
			);
			await expect(
				OidcHelper.exchangeCodeForTokens("https://issuer.example.com/token", config, exchange)
			).resolves.toEqual({ idToken: "id-token-1", accessToken: undefined });
		});

		it("should reject when the provider rejects the code", async () => {
			vi.spyOn(FetchHelper, "fetch").mockResolvedValue(new Response("{}", { status: 400 }));

			await expect(
				OidcHelper.exchangeCode(
					"https://issuer.example.com/token",
					{ clientId: CLIENT_ID, clientSecret: "secret" },
					exchange
				)
			).rejects.toThrow(UnauthorizedError);
		});

		it("should reject when the provider returns no ID token", async () => {
			vi.spyOn(FetchHelper, "fetch").mockResolvedValue(
				new Response(JSON.stringify({ token: "a" }))
			);

			await expect(
				OidcHelper.exchangeCode(
					"https://issuer.example.com/token",
					{ clientId: CLIENT_ID, clientSecret: "secret" },
					exchange
				)
			).rejects.toThrow(UnauthorizedError);
		});
	});

	describe("verifyIdToken", () => {
		it("should require a nonce", async () => {
			const fetchSpy = vi.spyOn(FetchHelper, "fetch");

			await expect(
				OidcHelper.exchangeCode(
					"https://issuer.example.com/token",
					{ clientId: CLIENT_ID, clientSecret: "secret" },
					{
						code: "code-1",
						codeVerifier: "verifier-1",
						redirectUri: "https://x.example.com",
						nonce: ""
					}
				)
			).rejects.toMatchObject({ name: "GuardError" });
			expect(fetchSpy).not.toHaveBeenCalled();
			await expect(
				OidcHelper.verifyIdToken(await signIdToken(), { ...options, nonce: "" })
			).rejects.toMatchObject({ name: "GuardError" });
		});

		it("should return the payload of a valid token", async () => {
			const payload = await OidcHelper.verifyIdToken(await signIdToken(), options);

			expect(payload.sub).toBe("subject-1");
			expect(payload.email).toBe("user@example.com");
		});

		it("should accept an audience list that contains the client", async () => {
			const payload = await OidcHelper.verifyIdToken(
				await signIdToken({ aud: ["other", CLIENT_ID] }),
				options
			);

			expect(payload.sub).toBe("subject-1");
		});

		it.each([
			{
				claim: "issuer",
				overrides: { iss: "https://other.example.com" },
				message: "idTokenIssuerInvalid"
			},
			{ claim: "audience", overrides: { aud: "other-client" }, message: "idTokenAudienceInvalid" },
			{ claim: "nonce", overrides: { nonce: "other-nonce" }, message: "idTokenNonceInvalid" }
		])("should reject a token with the wrong $claim", async ({ overrides, message }) => {
			await expect(
				OidcHelper.verifyIdToken(await signIdToken(overrides), options)
			).rejects.toMatchObject({
				name: UnauthorizedError.CLASS_NAME,
				message: `oidcHelper.${message}`
			});
		});

		it("should reject an expired token", async () => {
			await expect(
				OidcHelper.verifyIdToken(
					await signIdToken({ exp: Math.trunc(Date.now() / DurationConstants.MsPerSecond) - 60 }),
					options
				)
			).rejects.toThrow(UnauthorizedError);
		});

		it("should reject a token signed with an unknown key", async () => {
			await expect(
				OidcHelper.verifyIdToken(await signIdToken({}, "other-key"), options)
			).rejects.toMatchObject({ message: "oidcHelper.signingKeyNotFound" });
		});

		it("should fetch the keys again once for an unknown key, as the provider may have rotated them", async () => {
			const rotatedOptions = { ...options, jwksUri: "https://issuer.example.com/rotated-keys" };
			const fetchSpy = vi
				.spyOn(FetchHelper, "fetchJson")
				.mockResolvedValueOnce({ keys: [{ ...publicJwk, kid: "old-key" }] })
				.mockResolvedValueOnce({ keys: [publicJwk] });
			const removeSpy = vi.spyOn(FetchHelper, "removeCacheEntry");

			const payload = await OidcHelper.verifyIdToken(await signIdToken(), rotatedOptions);

			expect(payload.sub).toBe("subject-1");
			expect(fetchSpy).toHaveBeenCalledTimes(2);
			expect(removeSpy).toHaveBeenCalledWith(rotatedOptions.jwksUri);
		});

		it("should fetch the keys for unknown keys at most once a minute", async () => {
			vi.useFakeTimers({ toFake: ["Date"] });
			try {
				const throttledOptions = {
					...options,
					jwksUri: "https://issuer.example.com/throttled-keys"
				};
				const fetchSpy = vi.spyOn(FetchHelper, "fetchJson").mockResolvedValue({ keys: [] });

				for (let i = 0; i < 3; i++) {
					await expect(
						OidcHelper.verifyIdToken(await signIdToken({}, `made-up-${i}`), throttledOptions)
					).rejects.toMatchObject({ message: "oidcHelper.signingKeyNotFound" });
				}
				// The first lookup fetches again, the others use the keys already held.
				expect(fetchSpy).toHaveBeenCalledTimes(4);

				vi.advanceTimersByTime(DurationConstants.MsPerMinute);
				await expect(
					OidcHelper.verifyIdToken(await signIdToken({}, "made-up-3"), throttledOptions)
				).rejects.toMatchObject({ message: "oidcHelper.signingKeyNotFound" });
				expect(fetchSpy).toHaveBeenCalledTimes(6);
			} finally {
				vi.useRealTimers();
			}
		});

		it("should reject a token with a tampered payload", async () => {
			const [header, , signature] = (await signIdToken()).split(".");
			const tampered = Converter.bytesToBase64Url(
				Converter.utf8ToBytes(
					JSON.stringify({ iss: ISSUER, aud: CLIENT_ID, sub: "attacker", nonce: NONCE })
				)
			);

			await expect(
				OidcHelper.verifyIdToken(`${header}.${tampered}.${signature}`, options)
			).rejects.toMatchObject({ message: "oidcHelper.idTokenSignatureInvalid" });
		});

		it("should reject a token that is not signed with RS256", async () => {
			const [, payload, signature] = (await signIdToken()).split(".");
			const header = Converter.bytesToBase64Url(
				Converter.utf8ToBytes(JSON.stringify({ alg: "none", kid: KID }))
			);

			await expect(
				OidcHelper.verifyIdToken(`${header}.${payload}.${signature}`, options)
			).rejects.toMatchObject({ message: "oidcHelper.idTokenHeaderInvalid" });
		});
	});

	describe("toIdentity", () => {
		it("should map the claims to an identity with a schema.org Person profile", () => {
			expect(
				OidcHelper.toIdentity({
					sub: "subject-1",
					email: "user@example.com",
					[OidcHelper.CLAIM_GIVEN_NAME]: "Ada",
					[OidcHelper.CLAIM_FAMILY_NAME]: "Lovelace"
				})
			).toEqual({
				providerAccountId: "subject-1",
				email: "user@example.com",
				profile: {
					"@context": "https://schema.org",
					"@type": "Person",
					email: "user@example.com",
					givenName: "Ada",
					familyName: "Lovelace"
				}
			});
		});

		it("should read the e-mail address from the claims in order", () => {
			expect(
				OidcHelper.toIdentity(
					{ sub: "subject-1", [OidcHelper.CLAIM_PREFERRED_USERNAME]: "user@example.com" },
					["email", OidcHelper.CLAIM_PREFERRED_USERNAME]
				).email
			).toBe("user@example.com");
		});

		it("should normalise the e-mail address but keep the subject as issued", () => {
			const identity = OidcHelper.toIdentity({ sub: "Subject-1", email: " User@Example.COM " });

			expect(identity.email).toBe("user@example.com");
			expect(identity.providerAccountId).toBe("Subject-1");
		});

		it("should reject claims without an e-mail address", () => {
			expect(() => OidcHelper.toIdentity({ sub: "subject-1" })).toThrow(UnauthorizedError);
		});
	});
});
