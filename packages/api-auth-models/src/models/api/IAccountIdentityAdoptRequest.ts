// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IProof } from "@3sixty/standards-w3c-did";

/**
 * Adopt an identity for the signed in account.
 */
export interface IAccountIdentityAdoptRequest {
	/**
	 * The identity to adopt, an empty object creates a new self-controlled DID. The body is required
	 * so a cross-site form post cannot adopt an identity.
	 */
	body: {
		/**
		 * The DID to adopt.
		 */
		identity?: string;

		/**
		 * A proof by the DID over the identity proof document, required with the identity.
		 */
		proof?: IProof;
	};
}
