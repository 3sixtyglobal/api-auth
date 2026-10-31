// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { BaseError, Converter, GeneralError, Guards, Is } from "@3sixty/core";
import type { IJsonLdNodeObject } from "@3sixty/data-json-ld";
import type { ILoggingComponent } from "@3sixty/logging-models";
import { nameof } from "@3sixty/nameof";
import { SchemaOrgContexts } from "@3sixty/standards-schema-org";
import { HeaderTypes, HttpStatusCode } from "@3sixty/web";

/**
 * Helper class for fetching the photo an authentication provider holds for an account.
 */
export class AvatarHelper {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<AvatarHelper>();

	/**
	 * The content types a photo is accepted in.
	 */
	public static readonly CONTENT_TYPES: string[] = ["image/jpeg", "image/png", "image/webp"];

	/**
	 * The largest photo accepted, in bytes.
	 */
	public static readonly MAX_BYTES: number = 1048576;

	/**
	 * How long to wait for a photo, in milliseconds.
	 */
	public static readonly TIMEOUT_MS: number = 10000;

	/**
	 * Fetch a photo as a schema.org ImageObject holding a data URL. A failure is logged and never
	 * thrown, so it can not fail a sign in.
	 * @param url The address of the photo.
	 * @param size The size requested from the provider.
	 * @param size.width The width in pixels.
	 * @param size.height The height in pixels.
	 * @param headers The headers to send.
	 * @param logging The logging component to log a failure with.
	 * @returns The photo, null when the provider holds none, or undefined when it could not be fetched.
	 */
	public static async fetch(
		url: string,
		size: { width: number; height: number },
		headers?: { [name: string]: string },
		logging?: ILoggingComponent
	): Promise<IJsonLdNodeObject | null | undefined> {
		try {
			return await AvatarHelper.fetchImage(url, size, headers);
		} catch (error) {
			await logging?.log({
				level: "warn",
				source: AvatarHelper.CLASS_NAME,
				ts: Date.now(),
				message: "avatarFetchFailed",
				error: BaseError.fromError(error)
			});
			return undefined;
		}
	}

	/**
	 * Fetch a photo.
	 * @param url The address of the photo.
	 * @param size The size requested from the provider.
	 * @param size.width The width in pixels.
	 * @param size.height The height in pixels.
	 * @param headers The headers to send.
	 * @returns The photo, or null when the provider holds none.
	 * @throws GeneralError when the photo could not be fetched or is too large.
	 * @internal
	 */
	private static async fetchImage(
		url: string,
		size: { width: number; height: number },
		headers?: { [name: string]: string }
	): Promise<IJsonLdNodeObject | null> {
		Guards.stringValue(AvatarHelper.CLASS_NAME, nameof(url), url);

		// The timeout also covers reading the body.
		const response = await fetch(url, {
			method: "GET",
			headers,
			signal: AbortSignal.timeout(AvatarHelper.TIMEOUT_MS)
		});
		if (response.status === HttpStatusCode.notFound) {
			await response.body?.cancel();
			return null;
		}
		if (!response.ok) {
			await response.body?.cancel();
			throw new GeneralError(AvatarHelper.CLASS_NAME, "avatarResponseFailed", {
				status: response.status
			});
		}

		const contentType = (response.headers.get(HeaderTypes.ContentType) ?? "")
			.split(";")[0]
			.trim()
			.toLowerCase();
		if (!AvatarHelper.CONTENT_TYPES.includes(contentType)) {
			await response.body?.cancel();
			return null;
		}

		const bytes = await AvatarHelper.readBody(response);
		if (bytes.length === 0) {
			return null;
		}

		return {
			"@context": SchemaOrgContexts.Context,
			"@type": "ImageObject",
			encodingFormat: contentType,
			contentUrl: `data:${contentType};base64,${Converter.bytesToBase64(bytes)}`,
			width: size.width,
			height: size.height
		};
	}

	/**
	 * Read the body of a response, refusing one larger than the limit.
	 * @param response The response.
	 * @returns The body.
	 * @throws GeneralError when the body is too large.
	 * @internal
	 */
	private static async readBody(response: Response): Promise<Uint8Array> {
		const tooLarge = new GeneralError(AvatarHelper.CLASS_NAME, "avatarTooLarge", {
			maxBytes: AvatarHelper.MAX_BYTES
		});
		const contentLength = Number.parseInt(
			response.headers.get(HeaderTypes.ContentLength) ?? "",
			10
		);
		if (Is.integer(contentLength) && contentLength > AvatarHelper.MAX_BYTES) {
			await response.body?.cancel();
			throw tooLarge;
		}

		const reader = response.body?.getReader();
		if (Is.undefined(reader)) {
			return new Uint8Array();
		}
		const chunks: Uint8Array[] = [];
		let total = 0;
		let chunk = await reader.read();
		while (!chunk.done) {
			total += chunk.value.length;
			if (total > AvatarHelper.MAX_BYTES) {
				await reader.cancel();
				throw tooLarge;
			}
			chunks.push(chunk.value);
			chunk = await reader.read();
		}

		const bytes = new Uint8Array(total);
		let offset = 0;
		for (const part of chunks) {
			bytes.set(part, offset);
			offset += part.length;
		}
		return bytes;
	}
}
