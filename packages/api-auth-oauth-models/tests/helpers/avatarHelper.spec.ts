// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { Converter } from "@3sixty/core";
import type { ILoggingComponent } from "@3sixty/logging-models";
import { MimeTypes } from "@3sixty/web";
import { AvatarHelper } from "../../src/helpers/avatarHelper.js";

const URL_1 = "https://photos.example.com/avatar";
const SIZE = { width: 512, height: 512 };

/**
 * Create a logging component that records what is logged.
 * @returns The component.
 */
function createLogging(): ILoggingComponent & {
	log: ReturnType<typeof vi.fn<ILoggingComponent["log"]>>;
} {
	return {
		className: () => "logging",
		log: vi.fn<ILoggingComponent["log"]>(),
		query: vi.fn<ILoggingComponent["query"]>()
	};
}

describe("AvatarHelper", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("should return the photo as an ImageObject with a data URL in the content type of the response", async () => {
		const bytes = new Uint8Array([1, 2, 3, 4, 5]);
		const fetchStub = vi
			.fn()
			.mockResolvedValue(
				new Response(bytes, { headers: { "content-type": "image/PNG; charset=binary" } })
			);
		vi.stubGlobal("fetch", fetchStub);

		await expect(
			AvatarHelper.fetch(URL_1, SIZE, { authorization: "Bearer token-1" })
		).resolves.toEqual({
			"@context": "https://schema.org",
			"@type": "ImageObject",
			encodingFormat: MimeTypes.Png,
			contentUrl: `data:${MimeTypes.Png};base64,${Converter.bytesToBase64(bytes)}`,
			width: "512",
			height: "512"
		});
		expect(fetchStub).toHaveBeenCalledWith(
			URL_1,
			expect.objectContaining({
				method: "GET",
				headers: { authorization: "Bearer token-1" },
				signal: expect.any(AbortSignal)
			})
		);
	});

	it("should return null when the provider holds no photo", async () => {
		for (const response of [
			new Response("missing", { status: 404 }),
			new Response("text", { headers: { "content-type": MimeTypes.Html } }),
			new Response(new Uint8Array([1]), { headers: { "content-type": MimeTypes.Gif } }),
			new Response(new Uint8Array([1])),
			new Response(new Uint8Array(), { headers: { "content-type": MimeTypes.Jpeg } })
		]) {
			vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
			await expect(AvatarHelper.fetch(URL_1, SIZE)).resolves.toBeNull();
		}
	});

	it("should log a failure and return undefined", async () => {
		const logging = createLogging();

		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("error", { status: 500 })));
		await expect(AvatarHelper.fetch(URL_1, SIZE, undefined, logging)).resolves.toBeUndefined();
		expect(logging.log).toHaveBeenLastCalledWith(
			expect.objectContaining({
				level: "warn",
				source: "AvatarHelper",
				message: "avatarFetchFailed",
				error: expect.objectContaining({ message: "avatarHelper.avatarResponseFailed" })
			})
		);

		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
		await expect(AvatarHelper.fetch(URL_1, SIZE, undefined, logging)).resolves.toBeUndefined();
		expect(logging.log).toHaveBeenCalledTimes(2);

		// Without a logging component the failure is still not thrown.
		await expect(AvatarHelper.fetch(URL_1, SIZE)).resolves.toBeUndefined();
	});

	it("should refuse a photo larger than the limit", async () => {
		const logging = createLogging();
		const tooLarge = expect.objectContaining({
			error: expect.objectContaining({
				message: "avatarHelper.avatarTooLarge",
				properties: { maxBytes: 1048576 }
			})
		});

		// Refused from the length the response gives.
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				new Response(new Uint8Array(10), {
					headers: { "content-type": MimeTypes.Jpeg, "content-length": "1048577" }
				})
			)
		);
		await expect(AvatarHelper.fetch(URL_1, SIZE, undefined, logging)).resolves.toBeUndefined();
		expect(logging.log).toHaveBeenLastCalledWith(tooLarge);

		// Refused while reading a body that gives no length.
		const chunk = new Uint8Array(524288);
		const body = new ReadableStream<Uint8Array>({
			pull(controller): void {
				controller.enqueue(chunk);
			}
		});
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(new Response(body, { headers: { "content-type": MimeTypes.Jpeg } }))
		);
		await expect(AvatarHelper.fetch(URL_1, SIZE, undefined, logging)).resolves.toBeUndefined();
		expect(logging.log).toHaveBeenLastCalledWith(tooLarge);

		// A photo at the limit is accepted.
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				new Response(new Uint8Array(AvatarHelper.DEFAULT_MAX_BYTES), {
					headers: { "content-type": MimeTypes.WebP }
				})
			)
		);
		await expect(AvatarHelper.fetch(URL_1, SIZE)).resolves.toMatchObject({
			encodingFormat: MimeTypes.WebP
		});
	});

	it("should fetch with the limits given in the options", async () => {
		const logging = createLogging();
		const timeout = vi.spyOn(AbortSignal, "timeout");
		vi.stubGlobal(
			"fetch",
			vi.fn().mockImplementation(
				async () =>
					new Response(new Uint8Array(11), {
						headers: { "content-type": MimeTypes.Jpeg }
					})
			)
		);

		await expect(
			AvatarHelper.fetch(URL_1, SIZE, undefined, logging, { maxBytes: 10, timeoutMs: 500 })
		).resolves.toBeUndefined();
		expect(timeout).toHaveBeenLastCalledWith(500);
		expect(logging.log).toHaveBeenLastCalledWith(
			expect.objectContaining({
				error: expect.objectContaining({
					message: "avatarHelper.avatarTooLarge",
					properties: { maxBytes: 10 }
				})
			})
		);

		// Without options the defaults apply.
		await expect(AvatarHelper.fetch(URL_1, SIZE)).resolves.toMatchObject({
			encodingFormat: MimeTypes.Jpeg
		});
		expect(timeout).toHaveBeenLastCalledWith(AvatarHelper.DEFAULT_TIMEOUT_MS);
		timeout.mockRestore();
	});
});
