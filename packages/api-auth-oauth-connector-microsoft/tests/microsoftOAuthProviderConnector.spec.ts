// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { type IOidcIdTokenOptions, OidcHelper } from "@3sixty/api-auth-oauth-models";
import { MicrosoftOAuthProviderConnector } from "../src/microsoftOAuthProviderConnector.js";

const TENANT_ID = "4f0b7c1e-2d3a-4b5c-8d9e-0a1b2c3d4e5f";
const EXCHANGE = {
	code: "code-1",
	codeVerifier: "verifier-1",
	redirectUri: "https://node.example.com/authentication/oauth/microsoft/callback",
	nonce: "nonce-1"
};

/**
 * Run a sign in and capture the ID token checks the connector asked for.
 * @param connector The connector to sign in with.
 * @returns The checks passed to the ID token verification.
 */
async function captureVerifyOptions(
	connector: MicrosoftOAuthProviderConnector
): Promise<IOidcIdTokenOptions | undefined> {
	let verifyOptions: IOidcIdTokenOptions | undefined;
	vi.spyOn(OidcHelper, "exchangeCodeForTokens").mockResolvedValue({ idToken: "id-token" });
	vi.spyOn(OidcHelper, "verifyIdToken").mockImplementation(async (token, options) => {
		verifyOptions = options;
		return {
			sub: "subject-1",
			tid: TENANT_ID,
			[MicrosoftOAuthProviderConnector.CLAIM_EMAIL_DOMAIN_OWNER_VERIFIED]: true,
			[OidcHelper.CLAIM_PREFERRED_USERNAME]: "user@example.com"
		};
	});
	await connector.authenticate(EXCHANGE);
	return verifyOptions;
}

describe("MicrosoftOAuthProviderConnector", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it("should register under the microsoft provider id", () => {
		const connector = new MicrosoftOAuthProviderConnector({
			config: { clientId: "ms-client", clientSecret: "ms-secret", tenant: "common" }
		});

		expect(MicrosoftOAuthProviderConnector.NAMESPACE).toBe("microsoft");
		expect(connector.className()).toBe(MicrosoftOAuthProviderConnector.CLASS_NAME);
	});

	it("should redirect to Microsoft and send password and profile changes there", () => {
		const connector = new MicrosoftOAuthProviderConnector({
			config: { clientId: "ms-client", clientSecret: "ms-secret", tenant: "common" }
		});

		expect(connector.getCapabilities()).toEqual({
			signInMethod: "redirect",
			passwordChange: "external",
			passwordChangeUrl: MicrosoftOAuthProviderConnector.PASSWORD_CHANGE_URL,
			profileReadOnly: true,
			profileEditUrl: MicrosoftOAuthProviderConnector.PROFILE_EDIT_URL
		});
	});

	it("should give the addresses of the tenant and return the tenant of a sign in", async () => {
		const connector = new MicrosoftOAuthProviderConnector({
			config: { clientId: "ms-client", clientSecret: "ms-secret", tenant: "common" }
		});

		expect(connector.getCapabilities("9188040d-6c67-4c5b-b112-36a304b66dad")).toMatchObject({
			profileEditUrl: MicrosoftOAuthProviderConnector.PERSONAL_PROFILE_EDIT_URL,
			passwordChangeUrl: MicrosoftOAuthProviderConnector.PERSONAL_PASSWORD_CHANGE_URL
		});
		expect(connector.getCapabilities(TENANT_ID)).toMatchObject({
			profileEditUrl: MicrosoftOAuthProviderConnector.PROFILE_EDIT_URL,
			passwordChangeUrl: MicrosoftOAuthProviderConnector.PASSWORD_CHANGE_URL
		});

		vi.spyOn(OidcHelper, "exchangeCodeForTokens").mockResolvedValue({ idToken: "id-token" });
		vi.spyOn(OidcHelper, "verifyIdToken").mockResolvedValueOnce({
			sub: "subject-1",
			tid: TENANT_ID,
			[MicrosoftOAuthProviderConnector.CLAIM_EMAIL_DOMAIN_OWNER_VERIFIED]: true,
			email: "user@example.com"
		});
		await expect(connector.authenticate(EXCHANGE)).resolves.toMatchObject({
			providerTenantId: TENANT_ID
		});
	});

	it("should use the endpoints of the configured tenant", async () => {
		const connector = new MicrosoftOAuthProviderConnector({
			config: { clientId: "ms-client", clientSecret: "ms-secret", tenant: "common" }
		});

		const url = new URL(
			connector.authorizationUrl({
				state: "state-1",
				nonce: "nonce-1",
				codeChallenge: "challenge-1",
				redirectUri: EXCHANGE.redirectUri
			})
		);
		expect(url.origin + url.pathname).toBe(
			"https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
		);

		const verifyOptions = await captureVerifyOptions(connector);
		expect(OidcHelper.exchangeCodeForTokens).toHaveBeenCalledWith(
			"https://login.microsoftonline.com/common/oauth2/v2.0/token",
			{ clientId: "ms-client", clientSecret: "ms-secret", tenant: "common" },
			EXCHANGE
		);
		expect(verifyOptions?.jwksUri).toBe(
			"https://login.microsoftonline.com/common/discovery/v2.0/keys"
		);
	});

	it("should accept the issuer of the tenant the token was issued in", async () => {
		const connector = new MicrosoftOAuthProviderConnector({
			config: { clientId: "ms-client", clientSecret: "ms-secret", tenant: "common" }
		});

		const verifyOptions = await captureVerifyOptions(connector);

		expect(
			verifyOptions?.isIssuer(`https://login.microsoftonline.com/${TENANT_ID}/v2.0`, {
				tid: TENANT_ID
			})
		).toBe(true);
		expect(
			verifyOptions?.isIssuer("https://login.microsoftonline.com/other/v2.0", { tid: TENANT_ID })
		).toBe(false);
		expect(verifyOptions?.isIssuer(`https://login.microsoftonline.com/${TENANT_ID}/v2.0`, {})).toBe(
			false
		);
	});

	it("should only accept the configured tenant when one is set", async () => {
		const connector = new MicrosoftOAuthProviderConnector({
			config: { clientId: "ms-client", clientSecret: "ms-secret", tenant: "tenant-1" }
		});

		const verifyOptions = await captureVerifyOptions(connector);

		expect(
			verifyOptions?.isIssuer("https://login.microsoftonline.com/tenant-1/v2.0", {
				tid: "tenant-1"
			})
		).toBe(true);
		expect(
			verifyOptions?.isIssuer(`https://login.microsoftonline.com/${TENANT_ID}/v2.0`, {
				tid: TENANT_ID
			})
		).toBe(false);
	});

	it("should fall back to the preferred username for the e-mail address", async () => {
		const connector = new MicrosoftOAuthProviderConnector({
			config: { clientId: "ms-client", clientSecret: "ms-secret", tenant: "common" }
		});
		vi.spyOn(OidcHelper, "exchangeCodeForTokens").mockResolvedValue({ idToken: "id-token" });
		vi.spyOn(OidcHelper, "verifyIdToken").mockResolvedValue({
			sub: "subject-1",
			tid: TENANT_ID,
			[MicrosoftOAuthProviderConnector.CLAIM_EMAIL_DOMAIN_OWNER_VERIFIED]: true,
			[OidcHelper.CLAIM_PREFERRED_USERNAME]: "user@example.com"
		});

		const identity = await connector.authenticate(EXCHANGE);

		expect(identity).toMatchObject({
			providerAccountId: "subject-1",
			email: "user@example.com",
			profileReadOnly: true,
			profileEditUrl: MicrosoftOAuthProviderConnector.PROFILE_EDIT_URL
		});
	});

	it("should require the tenant to be set", () => {
		expect(
			() =>
				new MicrosoftOAuthProviderConnector({
					config: { clientId: "ms-client", clientSecret: "ms-secret" } as never
				})
		).toThrow();
	});

	it("should only accept an e-mail address the tenant has verified", async () => {
		const connector = new MicrosoftOAuthProviderConnector({
			config: { clientId: "ms-client", clientSecret: "ms-secret", tenant: "common" }
		});
		vi.spyOn(OidcHelper, "exchangeCodeForTokens").mockResolvedValue({ idToken: "id-token" });
		const verify = vi.spyOn(OidcHelper, "verifyIdToken");

		for (const xmsEdov of [undefined, false, "true"]) {
			verify.mockResolvedValueOnce({
				sub: "subject-1",
				tid: TENANT_ID,
				[MicrosoftOAuthProviderConnector.CLAIM_EMAIL_DOMAIN_OWNER_VERIFIED]: xmsEdov,
				email: "user@example.com"
			});
			await expect(connector.authenticate(EXCHANGE)).rejects.toMatchObject({
				name: "UnauthorizedError",
				message: "microsoftOAuthProviderConnector.emailNotVerified"
			});
		}
	});

	it("should accept the e-mail address of a personal account without the domain owner claim", async () => {
		const connector = new MicrosoftOAuthProviderConnector({
			config: { clientId: "ms-client", clientSecret: "ms-secret", tenant: "common" }
		});
		vi.spyOn(OidcHelper, "exchangeCodeForTokens").mockResolvedValue({ idToken: "id-token" });
		vi.spyOn(OidcHelper, "verifyIdToken").mockResolvedValueOnce({
			sub: "subject-1",
			tid: MicrosoftOAuthProviderConnector.CONSUMER_TENANT_ID,
			email: "user@outlook.com"
		});

		await expect(connector.authenticate(EXCHANGE)).resolves.toMatchObject({
			email: "user@outlook.com",
			profileEditUrl: MicrosoftOAuthProviderConnector.PERSONAL_PROFILE_EDIT_URL,
			passwordChangeUrl: MicrosoftOAuthProviderConnector.PERSONAL_PASSWORD_CHANGE_URL
		});
	});

	it("should send personal and work accounts to their own configured addresses", async () => {
		const connector = new MicrosoftOAuthProviderConnector({
			config: {
				clientId: "ms-client",
				clientSecret: "ms-secret",
				tenant: "common",
				profileEditUrl: "https://work.example.com/profile",
				personalProfileEditUrl: "https://personal.example.com/profile",
				passwordChangeUrl: "https://work.example.com/password",
				personalPasswordChangeUrl: "https://personal.example.com/password"
			}
		});
		vi.spyOn(OidcHelper, "exchangeCodeForTokens").mockResolvedValue({ idToken: "id-token" });
		const verify = vi.spyOn(OidcHelper, "verifyIdToken");

		verify.mockResolvedValueOnce({
			sub: "subject-1",
			tid: MicrosoftOAuthProviderConnector.CONSUMER_TENANT_ID,
			email: "user@outlook.com"
		});
		await expect(connector.authenticate(EXCHANGE)).resolves.toMatchObject({
			profileEditUrl: "https://personal.example.com/profile",
			passwordChangeUrl: "https://personal.example.com/password"
		});

		verify.mockResolvedValueOnce({
			sub: "subject-2",
			tid: TENANT_ID,
			[MicrosoftOAuthProviderConnector.CLAIM_EMAIL_DOMAIN_OWNER_VERIFIED]: true,
			email: "user@example.com"
		});
		await expect(connector.authenticate(EXCHANGE)).resolves.toMatchObject({
			profileEditUrl: "https://work.example.com/profile",
			passwordChangeUrl: "https://work.example.com/password"
		});
	});

	it("should still refuse personal accounts when they are not among the allowed tenants", async () => {
		const connector = new MicrosoftOAuthProviderConnector({
			config: {
				clientId: "ms-client",
				clientSecret: "ms-secret",
				tenant: "common",
				allowedTenants: [TENANT_ID]
			}
		});
		vi.spyOn(OidcHelper, "exchangeCodeForTokens").mockResolvedValue({ idToken: "id-token" });
		vi.spyOn(OidcHelper, "verifyIdToken").mockResolvedValueOnce({
			sub: "subject-1",
			tid: MicrosoftOAuthProviderConnector.CONSUMER_TENANT_ID,
			email: "user@outlook.com"
		});

		await expect(connector.authenticate(EXCHANGE)).rejects.toMatchObject({
			name: "UnauthorizedError",
			message: "microsoftOAuthProviderConnector.tenantNotAllowed"
		});
	});

	it("should only accept the allowed tenants, trusting their e-mail addresses", async () => {
		const connector = new MicrosoftOAuthProviderConnector({
			config: {
				clientId: "ms-client",
				clientSecret: "ms-secret",
				tenant: "organizations",
				allowedTenants: [TENANT_ID]
			}
		});
		vi.spyOn(OidcHelper, "exchangeCodeForTokens").mockResolvedValue({ idToken: "id-token" });
		const verify = vi.spyOn(OidcHelper, "verifyIdToken");

		verify.mockResolvedValueOnce({ sub: "subject-1", tid: TENANT_ID, email: "user@example.com" });
		await expect(connector.authenticate(EXCHANGE)).resolves.toMatchObject({
			email: "user@example.com"
		});

		verify.mockResolvedValueOnce({
			sub: "subject-2",
			tid: "other-tenant",
			[MicrosoftOAuthProviderConnector.CLAIM_EMAIL_DOMAIN_OWNER_VERIFIED]: true,
			email: "user@other.example.com"
		});
		await expect(connector.authenticate(EXCHANGE)).rejects.toMatchObject({
			name: "UnauthorizedError",
			message: "microsoftOAuthProviderConnector.tenantNotAllowed"
		});
	});
});
