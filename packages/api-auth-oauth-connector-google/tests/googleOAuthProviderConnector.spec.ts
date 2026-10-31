// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { type IOidcIdTokenOptions, OidcHelper } from "@3sixty/api-auth-oauth-models";
import { UnauthorizedError } from "@3sixty/core";
import { GoogleOAuthProviderConnector } from "../src/googleOAuthProviderConnector.js";

const CONFIG = { clientId: "google-client", clientSecret: "google-secret" };
const EXCHANGE = {
	code: "code-1",
	codeVerifier: "verifier-1",
	redirectUri: "https://node.example.com/authentication/oauth/google/callback",
	nonce: "nonce-1"
};

describe("GoogleOAuthProviderConnector", () => {
	let connector: GoogleOAuthProviderConnector;

	beforeEach(() => {
		vi.restoreAllMocks();
		connector = new GoogleOAuthProviderConnector({ config: CONFIG });
	});

	it("should register under the google provider id", () => {
		expect(GoogleOAuthProviderConnector.NAMESPACE).toBe("google");
		expect(connector.className()).toBe(GoogleOAuthProviderConnector.CLASS_NAME);
	});

	it("should redirect to Google and send password and profile changes there", () => {
		expect(connector.getCapabilities()).toEqual({
			signInMethod: "redirect",
			passwordChange: "external",
			passwordChangeUrl: GoogleOAuthProviderConnector.PASSWORD_CHANGE_URL,
			profileReadOnly: true,
			profileEditUrl: GoogleOAuthProviderConnector.PROFILE_EDIT_URL
		});
	});

	it("should use the configured password change address", () => {
		const configured = new GoogleOAuthProviderConnector({
			config: { ...CONFIG, passwordChangeUrl: "https://app.example.com/password" }
		});

		expect(configured.getCapabilities().passwordChangeUrl).toBe("https://app.example.com/password");
	});

	it("should require a client id and secret", () => {
		expect(
			() => new GoogleOAuthProviderConnector({ config: { clientId: "", clientSecret: "s" } })
		).toThrow();
	});

	it("should send the browser to the Google authorization endpoint", () => {
		const url = new URL(
			connector.authorizationUrl({
				state: "state-1",
				nonce: "nonce-1",
				codeChallenge: "challenge-1",
				redirectUri: EXCHANGE.redirectUri
			})
		);

		expect(url.origin + url.pathname).toBe(GoogleOAuthProviderConnector.AUTHORIZATION_ENDPOINT);
		expect(url.searchParams.get("client_id")).toBe("google-client");
	});

	it("should exchange the code and return the identity for a verified e-mail address", async () => {
		const exchangeSpy = vi.spyOn(OidcHelper, "exchangeCode").mockResolvedValue("id-token");
		let verifyOptions: IOidcIdTokenOptions | undefined;
		vi.spyOn(OidcHelper, "verifyIdToken").mockImplementation(async (token, options) => {
			verifyOptions = options;
			return {
				sub: "subject-1",
				email: "user@example.com",
				[OidcHelper.CLAIM_EMAIL_VERIFIED]: true
			};
		});

		const identity = await connector.authenticate(EXCHANGE);

		expect(exchangeSpy).toHaveBeenCalledWith(
			GoogleOAuthProviderConnector.TOKEN_ENDPOINT,
			CONFIG,
			EXCHANGE
		);
		expect(verifyOptions).toMatchObject({
			jwksUri: GoogleOAuthProviderConnector.JWKS_URI,
			audience: "google-client",
			nonce: "nonce-1"
		});
		expect(verifyOptions?.isIssuer("https://accounts.google.com", {})).toBe(true);
		expect(verifyOptions?.isIssuer("accounts.google.com", {})).toBe(true);
		expect(verifyOptions?.isIssuer("https://evil.example.com", {})).toBe(false);
		expect(identity).toMatchObject({
			providerAccountId: "subject-1",
			email: "user@example.com",
			profileReadOnly: true,
			profileEditUrl: GoogleOAuthProviderConnector.PROFILE_EDIT_URL,
			passwordChangeUrl: GoogleOAuthProviderConnector.PASSWORD_CHANGE_URL
		});
	});

	it("should use the configured profile settings", async () => {
		vi.spyOn(OidcHelper, "exchangeCode").mockResolvedValue("id-token");
		vi.spyOn(OidcHelper, "verifyIdToken").mockResolvedValue({
			sub: "subject-1",
			email: "user@example.com",
			[OidcHelper.CLAIM_EMAIL_VERIFIED]: true
		});
		const configured = new GoogleOAuthProviderConnector({
			config: {
				...CONFIG,
				profileReadOnly: false,
				profileEditUrl: "https://app.example.com/profile",
				passwordChangeUrl: "https://app.example.com/password"
			}
		});

		const identity = await configured.authenticate(EXCHANGE);

		expect(identity).toMatchObject({
			profileReadOnly: false,
			profileEditUrl: "https://app.example.com/profile",
			passwordChangeUrl: "https://app.example.com/password"
		});
	});

	it("should reject an e-mail address Google has not verified", async () => {
		vi.spyOn(OidcHelper, "exchangeCode").mockResolvedValue("id-token");
		vi.spyOn(OidcHelper, "verifyIdToken").mockResolvedValue({
			sub: "subject-1",
			email: "user@example.com",
			[OidcHelper.CLAIM_EMAIL_VERIFIED]: false
		});

		await expect(connector.authenticate(EXCHANGE)).rejects.toThrow(UnauthorizedError);
	});

	it("should only accept the allowed domains by the hosted domain claim", async () => {
		const restricted = new GoogleOAuthProviderConnector({
			config: { ...CONFIG, allowedDomains: ["Example.com"] }
		});
		vi.spyOn(OidcHelper, "exchangeCode").mockResolvedValue("id-token");
		const verify = vi.spyOn(OidcHelper, "verifyIdToken");

		verify.mockResolvedValueOnce({
			sub: "subject-1",
			email: "user@other.org",
			[OidcHelper.CLAIM_EMAIL_VERIFIED]: true,
			hd: "example.com"
		});
		await expect(restricted.authenticate(EXCHANGE)).resolves.toMatchObject({
			email: "user@other.org"
		});

		verify.mockResolvedValueOnce({
			sub: "subject-2",
			email: "user@EXAMPLE.com",
			[OidcHelper.CLAIM_EMAIL_VERIFIED]: true
		});
		// The e-mail domain alone does not prove a Workspace account of the domain.
		await expect(restricted.authenticate(EXCHANGE)).rejects.toMatchObject({
			name: "UnauthorizedError",
			message: "googleOAuthProviderConnector.domainNotAllowed"
		});

		verify.mockResolvedValueOnce({
			sub: "subject-3",
			email: "user@example.com",
			[OidcHelper.CLAIM_EMAIL_VERIFIED]: true,
			hd: "other.org"
		});
		await expect(restricted.authenticate(EXCHANGE)).rejects.toMatchObject({
			name: "UnauthorizedError",
			message: "googleOAuthProviderConnector.domainNotAllowed"
		});

		verify.mockResolvedValueOnce({
			sub: "subject-4",
			email: "user@gmail.com",
			[OidcHelper.CLAIM_EMAIL_VERIFIED]: true
		});
		await expect(restricted.authenticate(EXCHANGE)).rejects.toThrow(UnauthorizedError);
	});
});
