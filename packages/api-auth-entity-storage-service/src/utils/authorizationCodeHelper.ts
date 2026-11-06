// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuthorizationCodeRequest } from "@3sixty/api-auth-entity-storage-models";
import { Converter, DurationConstants, Guards, Is, Mutex, RandomHelper } from "@3sixty/core";
import { Sha256 } from "@3sixty/crypto";
import { ComparisonOperator } from "@3sixty/entity";
import type { IEntityStorageConnector } from "@3sixty/entity-storage-models";
import { nameof } from "@3sixty/nameof";
import { PasswordResetHelper } from "./passwordResetHelper.js";
import type { AuthenticationAuthorizationCode } from "../entities/authenticationAuthorizationCode.js";

/**
 * Helper class for the single use OAuth 2.0 authorization codes of password accounts.
 */
export class AuthorizationCodeHelper {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<AuthorizationCodeHelper>();

	/**
	 * The number of random bytes in a code.
	 * @internal
	 */
	private static readonly _CODE_BYTES: number = 32;

	/**
	 * Create a code for an account.
	 * @param storage The entity storage for the codes.
	 * @param accountId The account id.
	 * @param authorization The authorization request the code is issued for.
	 * @param expirySeconds How long the code can be used for, in seconds.
	 * @returns The code.
	 */
	public static async create(
		storage: IEntityStorageConnector<AuthenticationAuthorizationCode>,
		accountId: string,
		authorization: IAuthorizationCodeRequest,
		expirySeconds: number
	): Promise<string> {
		Guards.stringValue(AuthorizationCodeHelper.CLASS_NAME, nameof(accountId), accountId);
		Guards.integer(AuthorizationCodeHelper.CLASS_NAME, nameof(expirySeconds), expirySeconds);

		const code = Converter.bytesToBase64Url(
			RandomHelper.generate(AuthorizationCodeHelper._CODE_BYTES)
		);
		const now = Date.now();
		const expiryMs = expirySeconds * DurationConstants.MsPerSecond;
		await storage.set({
			id: PasswordResetHelper.hashToken(code),
			accountId,
			redirectUri: authorization.redirectUri,
			codeChallenge: authorization.codeChallenge,
			nonce: authorization.nonce,
			expires: new Date(now + expiryMs).toISOString(),
			dateCreated: new Date(now).toISOString()
		});
		return code;
	}

	/**
	 * Redeem a code, removing it so it cannot be used again, even when it does not match.
	 * @param storage The entity storage for the codes.
	 * @param code The code.
	 * @param codeVerifier The PKCE code verifier the code challenge was made from.
	 * @param redirectUri The redirect address the code was sent to.
	 * @param nonce The nonce of the authorization request, checked when given.
	 * @returns The stored code, or undefined when it is unknown, used, expired or does not match.
	 */
	public static async redeem(
		storage: IEntityStorageConnector<AuthenticationAuthorizationCode>,
		code: string,
		codeVerifier: string,
		redirectUri: string,
		nonce?: string
	): Promise<AuthenticationAuthorizationCode | undefined> {
		const id = PasswordResetHelper.hashToken(code);
		// The lock stops two requests on this node both reading the code before it is removed.
		const lockKey = `authorization-code|${id}`;
		await Mutex.lock(lockKey, { throwOnTimeout: true });
		let stored: AuthenticationAuthorizationCode | undefined;
		try {
			stored = await storage.get(id);
			if (!Is.object<AuthenticationAuthorizationCode>(stored)) {
				return undefined;
			}
			await storage.remove(id);
		} finally {
			Mutex.unlock(lockKey);
		}

		const challenge = Converter.bytesToBase64Url(
			Sha256.sum256(Converter.utf8ToBytes(codeVerifier))
		);
		return Date.parse(stored.expires) > Date.now() &&
			stored.redirectUri === redirectUri &&
			stored.codeChallenge === challenge &&
			(Is.undefined(nonce) || stored.nonce === nonce)
			? stored
			: undefined;
	}

	/**
	 * Remove the codes that have expired.
	 * @param storage The entity storage for the codes.
	 * @returns The number of codes removed.
	 */
	public static async removeExpired(
		storage: IEntityStorageConnector<AuthenticationAuthorizationCode>
	): Promise<number> {
		// The ids are gathered first, as removing while paging would move the cursor past codes.
		const ids: string[] = [];
		let cursor: string | undefined;
		do {
			const page = await storage.query(
				{
					property: "expires",
					value: new Date().toISOString(),
					comparison: ComparisonOperator.LessThanOrEqual
				},
				undefined,
				["id"],
				cursor
			);
			for (const stored of page.entities) {
				if (Is.stringValue(stored.id)) {
					ids.push(stored.id);
				}
			}
			cursor = page.cursor;
		} while (Is.stringValue(cursor));

		if (ids.length > 0) {
			await storage.removeBatch(ids);
		}
		return ids.length;
	}
}
