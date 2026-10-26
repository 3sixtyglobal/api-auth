// Copyright 2026 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.

/**
 * The context resolved from an access token, everything a request needs that does not depend on
 * the route being called.
 */
export interface IAuthTokenContext {
	/**
	 * The tenant id from the token, if it carried one.
	 */
	tenantId?: string;

	/**
	 * The organization id of the tenant the token belongs to.
	 */
	tenantOrganizationId?: string;

	/**
	 * The public origin of the tenant the token belongs to.
	 */
	tenantPublicOrigin?: string;

	/**
	 * The account id of the verified user. This is the token subject.
	 */
	userIdentity?: string;

	/**
	 * The stored identity of the verified account, when it has one.
	 */
	identity?: string;

	/**
	 * The organization of the verified user.
	 */
	userOrganization?: string;

	/**
	 * The expiry of the token in milliseconds since the epoch, if it carried one.
	 */
	expires?: number;
}
