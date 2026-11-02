// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { BaseError, Converter, GeneralError, Guards, Is } from "@3sixty/core";
import type { ILoggingComponent } from "@3sixty/logging-models";
import { nameof } from "@3sixty/nameof";
import { SchemaOrgContexts } from "@3sixty/standards-schema-org";
import { HeaderTypes, HttpStatusCode, MimeTypes } from "@3sixty/web";
import type { ImageObjectLeaf, WithContext } from "schema-dts";
import type { IAvatarFetchOptions } from "../models/IAvatarFetchOptions.js";

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
	public static readonly CONTENT_TYPES: string[] = [MimeTypes.Jpeg, MimeTypes.Png, MimeTypes.WebP];

	/**
	 * The largest photo accepted, in bytes, when the options give no limit.
	 */
	public static readonly DEFAULT_MAX_BYTES: number = 1048576;

	/**
	 * How long to wait for a photo, in milliseconds, when the options give no timeout.
	 */
	public static readonly DEFAULT_TIMEOUT_MS: number = 10000;

	/**
	 * Fetch a photo as a schema.org ImageObject holding a data URL. A failure is logged and never
	 * thrown, so it can not fail a sign in.
	 * @param url The address of the photo.
	 * @param size The size requested from the provider.
	 * @param size.width The width in pixels.
	 * @param size.height The height in pixels.
	 * @param headers The headers to send.
	 * @param logging The logging component to log a failure with.
	 * @param options The limits to fetch the photo with, the defaults when left out.
	 * @returns The photo, null when the provider holds none, or undefined when it could not be fetched.
	 */
	public static async fetch(
		url: string,
		size: { width: number; height: number },
		headers?: { [name: string]: string },
		logging?: ILoggingComponent,
		options?: IAvatarFetchOptions
	): Promise<WithContext<ImageObjectLeaf> | null | undefined> {
		try {
			return await AvatarHelper.fetchImage(url, size, headers, options);
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
	 * @param options The limits to fetch the photo with.
	 * @returns The photo, or null when the provider holds none.
	 * @throws GeneralError when the photo could not be fetched or is too large.
	 * @internal
	 */
	private static async fetchImage(
		url: string,
		size: { width: number; height: number },
		headers?: { [name: string]: string },
		options?: IAvatarFetchOptions
	): Promise<WithContext<ImageObjectLeaf> | null> {
		Guards.stringValue(AvatarHelper.CLASS_NAME, nameof(url), url);

		// The timeout also covers reading the body.
		const response = await fetch(url, {
			method: "GET",
			headers,
			signal: AbortSignal.timeout(options?.timeoutMs ?? AvatarHelper.DEFAULT_TIMEOUT_MS)
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

		const bytes = await AvatarHelper.readBody(
			response,
			options?.maxBytes ?? AvatarHelper.DEFAULT_MAX_BYTES
		);
		if (bytes.length === 0) {
			return null;
		}

		return {
			"@context": SchemaOrgContexts.Context,
			"@type": "ImageObject",
			encodingFormat: contentType,
			contentUrl: `data:${contentType};base64,${Converter.bytesToBase64(bytes)}`,
			width: size.width.toString(),
			height: size.height.toString()
		};
	}

	/**
	 * Read the body of a response, refusing one larger than the limit.
	 * @param response The response.
	 * @param maxBytes The largest body accepted, in bytes.
	 * @returns The body.
	 * @throws GeneralError when the body is too large.
	 * @internal
	 */
	private static async readBody(response: Response, maxBytes: number): Promise<Uint8Array> {
		const tooLarge = new GeneralError(AvatarHelper.CLASS_NAME, "avatarTooLarge", {
			maxBytes
		});
		const contentLength = Number.parseInt(
			response.headers.get(HeaderTypes.ContentLength) ?? "",
			10
		);
		if (Is.integer(contentLength) && contentLength > maxBytes) {
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
			if (total > maxBytes) {
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
