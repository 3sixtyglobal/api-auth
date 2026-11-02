// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IProof } from "@3sixty/standards-w3c-did";

/**
 * Store an item for any account.
 */
export interface IAccountDataAdminCreateRequest {
	/**
	 * The item to store.
	 */
	body: {
		/**
		 * The account to store the item for.
		 */
		accountId: string;

		/**
		 * The type of the item.
		 */
		type: string;

		/**
		 * The value of the item, a JSON object in the shape of its type.
		 */
		data: unknown;

		/**
		 * True to use the item first for its type, clearing any other default.
		 */
		isDefault?: boolean;

		/**
		 * A proof by the DID over the identity proof document, required when a caller without
		 * escalated privilege stores an identity.
		 */
		proof?: IProof;

		/**
		 * True when only admins may see and change the item.
		 */
		adminOnly?: boolean;
	};
}
