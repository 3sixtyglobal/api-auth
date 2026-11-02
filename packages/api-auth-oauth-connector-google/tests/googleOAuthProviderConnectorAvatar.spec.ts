// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { OidcHelper } from "@3sixty/api-auth-oauth-models";
import { ComponentFactory, Converter } from "@3sixty/core";
import { MimeTypes } from "@3sixty/web";
import { GoogleOAuthProviderConnector } from "../src/googleOAuthProviderConnector.js";

const CONFIG = { clientId: "google-client", clientSecret: "google-secret" };
const EXCHANGE = {
	code: "code-1",
	codeVerifier: "verifier-1",
	redirectUri: "https://node.example.com/authentication/oauth/google/callback",
	nonce: "nonce-1"
};
const PICTURE = "https://lh3.googleusercontent.com/a/ACg8ocKabc123=s96-c";

/**
 * Sign in with an ID token holding the claims.
 * @param connector The connector.
 * @param claims The extra claims of the ID token.
 * @returns The identity.
 */
async function signIn(
	connector: GoogleOAuthProviderConnector,
	claims: { [claim: string]: unknown }
): ReturnType<GoogleOAuthProviderConnector["authenticate"]> {
	vi.spyOn(OidcHelper, "exchangeCode").mockResolvedValue("id-token");
	vi.spyOn(OidcHelper, "verifyIdToken").mockResolvedValue({
		sub: "subject-1",
		email: "user@example.com",
		[OidcHelper.CLAIM_EMAIL_VERIFIED]: true,
		...claims
	});
	return connector.authenticate(EXCHANGE);
}

describe("GoogleOAuthProviderConnector avatar", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("should request the photo at 512 pixels", () => {
		for (const [picture, expected] of [
			[PICTURE, "https://lh3.googleusercontent.com/a/ACg8ocKabc123=s512-c"],
			[
				"https://lh3.googleusercontent.com/a/ACg8ocKabc123=s96-c-k-no",
				"https://lh3.googleusercontent.com/a/ACg8ocKabc123=s512-c"
			],
			[
				"https://lh3.googleusercontent.com/a/ACg8ocKabc123=w96-h96-p",
				"https://lh3.googleusercontent.com/a/ACg8ocKabc123=s512-c"
			],
			[
				"https://lh3.googleusercontent.com/a/ACg8ocKabc123",
				"https://lh3.googleusercontent.com/a/ACg8ocKabc123=s512-c"
			],
			[
				"https://lh5.googleusercontent.com/-abc/AAAAAAAAAAI/AAAAAAAAAAA/def/s96-c/photo.jpg",
				"https://lh5.googleusercontent.com/-abc/AAAAAAAAAAI/AAAAAAAAAAA/def/s512-c/photo.jpg"
			],
			[
				"https://LH3.GoogleUserContent.com/a/abc=s96-c?sz=50",
				"https://lh3.googleusercontent.com/a/abc=s512-c?sz=512"
			],
			["https://lh3.ggpht.com/a/abc=s96-c", "https://lh3.ggpht.com/a/abc=s512-c"]
		]) {
			expect(GoogleOAuthProviderConnector.avatarUrl(picture)).toBe(expected);
		}
	});

	it("should only fetch https addresses on the Google photo hosts", () => {
		for (const picture of [
			"http://lh3.googleusercontent.com/a/abc=s96-c",
			"https://evil.example.com/a/abc=s96-c",
			"https://evilgoogleusercontent.com/a/abc=s96-c",
			"https://lh3.googleusercontent.com.evil.example.com/a/abc",
			"https://lh3.googleusercontent.com@evil.example.com/a/abc",
			`data:${MimeTypes.Jpeg};base64,AAAA`,
			"not a url"
		]) {
			expect(GoogleOAuthProviderConnector.avatarUrl(picture)).toBeUndefined();
		}
	});

	it("should return the photo from the picture claim as an ImageObject", async () => {
		const bytes = new Uint8Array([255, 216, 255]);
		const fetchStub = vi
			.fn()
			.mockResolvedValue(new Response(bytes, { headers: { "content-type": MimeTypes.Jpeg } }));
		vi.stubGlobal("fetch", fetchStub);

		const identity = await signIn(new GoogleOAuthProviderConnector({ config: CONFIG }), {
			picture: PICTURE
		});

		expect(fetchStub).toHaveBeenCalledWith(
			"https://lh3.googleusercontent.com/a/ACg8ocKabc123=s512-c",
			expect.objectContaining({ method: "GET" })
		);
		expect(identity.avatar).toEqual({
			"@context": "https://schema.org",
			"@type": "ImageObject",
			encodingFormat: MimeTypes.Jpeg,
			contentUrl: `data:${MimeTypes.Jpeg};base64,${Converter.bytesToBase64(bytes)}`,
			width: "512",
			height: "512"
		});
		// The profile keeps the address the token gives.
		expect(identity.profile).toMatchObject({ image: PICTURE });
	});

	it("should give no photo without a picture claim on a Google host", async () => {
		const fetchStub = vi.fn();
		vi.stubGlobal("fetch", fetchStub);
		const connector = new GoogleOAuthProviderConnector({ config: CONFIG });

		await expect(signIn(connector, {})).resolves.toMatchObject({ avatar: null });
		await expect(
			signIn(connector, { picture: "https://evil.example.com/photo.jpg" })
		).resolves.toMatchObject({ avatar: null });
		expect(fetchStub).not.toHaveBeenCalled();
	});

	it("should give no photo when Google has none, and leave it unknown when the fetch fails", async () => {
		const logging = { className: () => "logging", log: vi.fn() };
		vi.spyOn(ComponentFactory, "getIfExists").mockImplementation(name => {
			if (name === "custom-logging") {
				return logging;
			}
			return undefined;
		});
		const connector = new GoogleOAuthProviderConnector({
			config: CONFIG,
			loggingComponentType: "custom-logging"
		});

		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 404 })));
		await expect(signIn(connector, { picture: PICTURE })).resolves.toMatchObject({ avatar: null });

		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
		const identity = await signIn(connector, { picture: PICTURE });
		expect(identity).toMatchObject({ providerAccountId: "subject-1" });
		expect(identity.avatar).toBeUndefined();
		expect(logging.log).toHaveBeenCalledWith(
			expect.objectContaining({ level: "warn", message: "avatarFetchFailed" })
		);
	});

	it("should not fetch the photo of a sign in that is refused", async () => {
		const fetchStub = vi.fn();
		vi.stubGlobal("fetch", fetchStub);
		const connector = new GoogleOAuthProviderConnector({
			config: { ...CONFIG, allowedDomains: ["example.com"] }
		});

		await expect(signIn(connector, { picture: PICTURE })).rejects.toMatchObject({
			name: "UnauthorizedError"
		});
		expect(fetchStub).not.toHaveBeenCalled();
	});
});
