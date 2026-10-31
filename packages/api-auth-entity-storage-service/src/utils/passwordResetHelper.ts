// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { Converter, Guards, Is, RandomHelper } from "@3sixty/core";
import { Sha256 } from "@3sixty/crypto";
import { ComparisonOperator } from "@3sixty/entity";
import type { IEntityStorageConnector } from "@3sixty/entity-storage-models";
import { nameof } from "@3sixty/nameof";
import type { AuthenticationPasswordReset } from "../entities/authenticationPasswordReset.js";

/**
 * Helper class for the single use tokens that reset a forgotten password or verify a sign up.
 */
export class PasswordResetHelper {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<PasswordResetHelper>();

	/**
	 * The purpose of a password reset token, stored as absent.
	 */
	public static readonly PURPOSE_PASSWORD_RESET: string = "password-reset";

	/**
	 * The purpose of a sign up verification token.
	 */
	public static readonly PURPOSE_REGISTRATION: string = "registration";

	/**
	 * The number of random bytes in a token.
	 * @internal
	 */
	private static readonly _TOKEN_BYTES: number = 32;

	/**
	 * Create a token for an account, replacing any token the account already has for the purpose.
	 * @param storage The entity storage for the tokens.
	 * @param accountId The account id.
	 * @param expiryMinutes How long the token can be used for, in minutes.
	 * @param purpose What the token is for, a password reset when omitted.
	 * @param passwordHash The password hash to store with the token, for a sign up.
	 * @returns The token and when it expires, in ISO date format.
	 */
	public static async create(
		storage: IEntityStorageConnector<AuthenticationPasswordReset>,
		accountId: string,
		expiryMinutes: number,
		purpose?: string,
		passwordHash?: Pick<
			AuthenticationPasswordReset,
			"password" | "salt" | "passwordAlgorithm" | "passwordHashParameters"
		>
	): Promise<{ token: string; expires: string }> {
		Guards.stringValue(PasswordResetHelper.CLASS_NAME, nameof(accountId), accountId);
		Guards.integer(PasswordResetHelper.CLASS_NAME, nameof(expiryMinutes), expiryMinutes);

		await PasswordResetHelper.removeForAccount(storage, accountId, purpose);

		const token = Converter.bytesToBase64Url(
			RandomHelper.generate(PasswordResetHelper._TOKEN_BYTES)
		);
		const now = Date.now();
		const expiryMs = expiryMinutes * 60000;
		const expires = new Date(now + expiryMs).toISOString();
		await storage.set({
			id: PasswordResetHelper.hashToken(token),
			accountId,
			expires,
			dateCreated: new Date(now).toISOString(),
			purpose: PasswordResetHelper.storedPurpose(purpose),
			password: passwordHash?.password,
			salt: passwordHash?.salt,
			passwordAlgorithm: passwordHash?.passwordAlgorithm,
			passwordHashParameters: passwordHash?.passwordHashParameters
		});
		return { token, expires };
	}

	/**
	 * Use a token, removing it so it cannot be used again.
	 * @param storage The entity storage for the tokens.
	 * @param token The token.
	 * @param purpose What the token must be for, a password reset when omitted.
	 * @returns The stored token, or undefined when it is unknown, used, for another purpose or has expired.
	 */
	public static async consume(
		storage: IEntityStorageConnector<AuthenticationPasswordReset>,
		token: string,
		purpose?: string
	): Promise<AuthenticationPasswordReset | undefined> {
		const id = PasswordResetHelper.hashToken(token);
		const reset = await storage.get(id);
		if (
			!Is.object<AuthenticationPasswordReset>(reset) ||
			reset.used === true ||
			reset.purpose !== PasswordResetHelper.storedPurpose(purpose)
		) {
			return undefined;
		}

		await storage.remove(id);
		return Date.parse(reset.expires) > Date.now() ? reset : undefined;
	}

	/**
	 * Remove the tokens that have expired.
	 * @param storage The entity storage for the tokens.
	 * @returns The number of tokens removed.
	 */
	public static async removeExpired(
		storage: IEntityStorageConnector<AuthenticationPasswordReset>
	): Promise<number> {
		// The ids are gathered first, as removing while paging would move the cursor past tokens.
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
			for (const reset of page.entities) {
				if (Is.stringValue(reset.id)) {
					ids.push(reset.id);
				}
			}
			cursor = page.cursor;
		} while (Is.stringValue(cursor));

		if (ids.length > 0) {
			await storage.removeBatch(ids);
		}
		return ids.length;
	}

	/**
	 * Remove the tokens of an account.
	 * @param storage The entity storage for the tokens.
	 * @param accountId The account id.
	 * @param purpose Only remove the tokens for this purpose, a password reset when omitted, or every
	 * token when all.
	 * @returns A promise that resolves when the tokens have been removed.
	 */
	public static async removeForAccount(
		storage: IEntityStorageConnector<AuthenticationPasswordReset>,
		accountId: string,
		purpose?: string
	): Promise<void> {
		const condition = {
			property: "accountId",
			value: accountId,
			comparison: ComparisonOperator.Equals
		};
		const storedPurpose = PasswordResetHelper.storedPurpose(purpose);
		// The ids are gathered first, as removing while paging would move the cursor past tokens. The
		// purpose is matched here, as it is not indexed and a password reset stores none.
		const ids: string[] = [];
		let cursor: string | undefined;
		do {
			const page = await storage.query(condition, undefined, ["id", "purpose"], cursor);
			for (const reset of page.entities) {
				if (Is.stringValue(reset.id) && (purpose === "all" || reset.purpose === storedPurpose)) {
					ids.push(reset.id);
				}
			}
			cursor = page.cursor;
		} while (Is.stringValue(cursor));

		if (ids.length > 0) {
			await storage.removeBatch(ids);
		}
	}

	/**
	 * Hash a token, so the token itself is not stored.
	 * @param token The token.
	 * @returns The hash, hex encoded.
	 */
	public static hashToken(token: string): string {
		Guards.stringValue(PasswordResetHelper.CLASS_NAME, nameof(token), token);
		return Converter.bytesToHex(Sha256.sum256(Converter.utf8ToBytes(token)));
	}

	/**
	 * Get the purpose as stored, password reset tokens keep no purpose so earlier tokens still work.
	 * @param purpose The purpose.
	 * @returns The stored purpose.
	 * @internal
	 */
	private static storedPurpose(purpose: string | undefined): string | undefined {
		return Is.undefined(purpose) || purpose === PasswordResetHelper.PURPOSE_PASSWORD_RESET
			? undefined
			: purpose;
	}
}
