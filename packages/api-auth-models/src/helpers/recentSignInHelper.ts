// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { DurationConstants, Is, UnauthorizedError } from "@3sixty/core";
import { nameof } from "@3sixty/nameof";

/**
 * Helper methods for operations that need the caller to have signed in recently, such as exporting
 * keys or removing an account.
 */
export class RecentSignInHelper {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<RecentSignInHelper>();

	/**
	 * The default time since signing in within which a sensitive operation is allowed, in seconds.
	 */
	public static readonly DEFAULT_MAX_AGE_SECONDS: number = 300;

	/**
	 * How far in the future a session start may be, to allow for clock skew, in seconds.
	 */
	public static readonly MAX_FUTURE_SKEW_SECONDS: number = 60;

	/**
	 * Ensure the session started recently, the session start is kept across token refreshes so only
	 * signing in again starts a new one. A start in the future beyond the allowed skew, such as a
	 * value in milliseconds, is refused.
	 * @param sessionStart When the session started in seconds, refused when omitted.
	 * @param maxAgeSeconds How long ago the session may have started, in seconds.
	 * @throws UnauthorizedError with the key recentSignInRequired when the session is not recent, so
	 * the caller can be asked to sign in again.
	 */
	public static guard(sessionStart: number | undefined, maxAgeSeconds: number): void {
		const nowSeconds = Math.floor(Date.now() / DurationConstants.MsPerSecond);
		if (
			!Is.integer(sessionStart) ||
			nowSeconds - sessionStart > maxAgeSeconds ||
			sessionStart - nowSeconds > RecentSignInHelper.MAX_FUTURE_SKEW_SECONDS
		) {
			throw new UnauthorizedError(RecentSignInHelper.CLASS_NAME, "recentSignInRequired", {
				maxAgeSeconds
			});
		}
	}
}
