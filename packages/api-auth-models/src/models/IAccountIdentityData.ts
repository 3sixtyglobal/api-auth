// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { DidContexts } from "@3sixty/standards-w3c-did";

/**
 * The value of an identity item of account data, a JSON-LD node naming the DID of the account.
 */
export interface IAccountIdentityData {
	/**
	 * The JSON-LD context, the DID context.
	 */
	"@context": typeof DidContexts.Context;

	/**
	 * The DID of the account.
	 */
	id: string;
}
