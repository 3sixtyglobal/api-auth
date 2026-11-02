// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { OidcHelper } from "@3sixty/api-auth-oauth-models";
import { ComponentFactory, Converter } from "@3sixty/core";
import { MimeTypes } from "@3sixty/web";
import { MicrosoftOAuthProviderConnector } from "../src/microsoftOAuthProviderConnector.js";

const CONFIG = { clientId: "ms-client", clientSecret: "ms-secret", tenant: "common" };
const EXCHANGE = {
	code: "code-1",
	codeVerifier: "verifier-1",
	redirectUri: "https://node.example.com/authentication/oauth/microsoft/callback",
	nonce: "nonce-1"
};

/**
 * Sign in, the code exchange returning the access token.
 * @param connector The connector.
 * @param accessToken The access token the exchange returns.
 * @param tenantId The tenant of the account.
 * @returns The identity.
 */
async function signIn(
	connector: MicrosoftOAuthProviderConnector,
	accessToken: string | undefined,
	tenantId: string = MicrosoftOAuthProviderConnector.CONSUMER_TENANT_ID
): ReturnType<MicrosoftOAuthProviderConnector["authenticate"]> {
	vi.spyOn(OidcHelper, "exchangeCodeForTokens").mockResolvedValue({
		idToken: "id-token",
		accessToken
	});
	vi.spyOn(OidcHelper, "verifyIdToken").mockResolvedValue({
		sub: "subject-1",
		tid: tenantId,
		[MicrosoftOAuthProviderConnector.CLAIM_EMAIL_DOMAIN_OWNER_VERIFIED]: true,
		email: "user@example.com"
	});
	return connector.authenticate(EXCHANGE);
}

describe("MicrosoftOAuthProviderConnector avatar", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("should request the Microsoft Graph scope needed to read the photo", () => {
		const request = {
			state: "state-1",
			nonce: "nonce-1",
			codeChallenge: "challenge-1",
			redirectUri: EXCHANGE.redirectUri
		};

		const scopes = (connector: MicrosoftOAuthProviderConnector): string | null =>
			new URL(connector.authorizationUrl(request)).searchParams.get("scope");

		expect(scopes(new MicrosoftOAuthProviderConnector({ config: CONFIG }))).toBe(
			"openid email profile User.Read"
		);
		expect(
			scopes(
				new MicrosoftOAuthProviderConnector({ config: { ...CONFIG, scopes: ["openid", "email"] } })
			)
		).toBe("openid email User.Read");
		expect(
			scopes(
				new MicrosoftOAuthProviderConnector({
					config: { ...CONFIG, scopes: ["openid", "email", "user.read"] }
				})
			)
		).toBe("openid email user.read");
	});

	it("should read the photo from Microsoft Graph with the access token", async () => {
		const bytes = new Uint8Array([255, 216, 255, 224]);
		const fetchStub = vi.fn(
			async () => new Response(bytes, { headers: { "content-type": MimeTypes.Jpeg } })
		);
		vi.stubGlobal("fetch", fetchStub);

		for (const tenantId of [
			MicrosoftOAuthProviderConnector.CONSUMER_TENANT_ID,
			"4f0b7c1e-2d3a-4b5c-8d9e-0a1b2c3d4e5f"
		]) {
			const identity = await signIn(
				new MicrosoftOAuthProviderConnector({ config: CONFIG }),
				"access-token-1",
				tenantId
			);

			expect(identity.avatar).toEqual({
				"@context": "https://schema.org",
				"@type": "ImageObject",
				encodingFormat: MimeTypes.Jpeg,
				contentUrl: `data:${MimeTypes.Jpeg};base64,${Converter.bytesToBase64(bytes)}`,
				width: "504",
				height: "504"
			});
		}
		expect(fetchStub).toHaveBeenCalledWith(
			"https://graph.microsoft.com/v1.0/me/photos/504x504/$value",
			expect.objectContaining({
				method: "GET",
				headers: { authorization: "Bearer access-token-1" }
			})
		);
		// The code is exchanged with the configured client.
		expect(OidcHelper.exchangeCodeForTokens).toHaveBeenCalledWith(
			"https://login.microsoftonline.com/common/oauth2/v2.0/token",
			CONFIG,
			EXCHANGE
		);
	});

	it("should give no photo when Graph has none or returns another content type", async () => {
		const connector = new MicrosoftOAuthProviderConnector({ config: CONFIG });

		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 404 })));
		await expect(signIn(connector, "access-token-1")).resolves.toMatchObject({ avatar: null });

		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValue(
					new Response(new Uint8Array([1]), { headers: { "content-type": MimeTypes.Bmp } })
				)
		);
		await expect(signIn(connector, "access-token-1")).resolves.toMatchObject({ avatar: null });
	});

	it("should leave the photo unknown when it can not be read", async () => {
		const logging = { className: () => "logging", log: vi.fn() };
		vi.spyOn(ComponentFactory, "getIfExists").mockImplementation(name => {
			if (name === "logging") {
				return logging;
			}
			return undefined;
		});
		const connector = new MicrosoftOAuthProviderConnector({ config: CONFIG });

		for (const response of [
			new Response("", { status: 401 }),
			new Response(new Uint8Array(10), {
				headers: { "content-type": MimeTypes.Jpeg, "content-length": "1048577" }
			})
		]) {
			vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
			const identity = await signIn(connector, "access-token-1");
			expect(identity).toMatchObject({ providerAccountId: "subject-1" });
			expect(identity.avatar).toBeUndefined();
		}
		expect(logging.log).toHaveBeenCalledTimes(2);

		// Without an access token Graph is not called.
		const fetchStub = vi.fn();
		vi.stubGlobal("fetch", fetchStub);
		const identity = await signIn(connector, undefined);
		expect(identity.avatar).toBeUndefined();
		expect(fetchStub).not.toHaveBeenCalled();
	});
});
