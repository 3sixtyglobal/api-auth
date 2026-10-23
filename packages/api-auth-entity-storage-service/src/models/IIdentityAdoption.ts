// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IComponent } from "@3sixty/core";

/**
 * The identity operations this service needs in order to attach a DID.
 * The identity package owns the full component. This is the slice used here.
 */
export interface IIdentityAdoption extends IComponent {
	/**
	 * Create a document controlled by the new DID.
	 * @returns The new document. Only the id is used.
	 */
	identityCreateSelf(): Promise<{
		/**
		 * The DID of the new document.
		 */
		id: string;
	}>;

	/**
	 * Remove a document.
	 * @param identity The document id to remove.
	 * @param options Optional removal settings.
	 * @param options.removeKeys Also remove associated private keys from the vault.
	 * @param options.removeDocumentKey Also remove the document key from the vault.
	 * @param controller The controller allowed to remove the document.
	 * @returns A promise that resolves when the document has been removed.
	 */
	identityRemove(
		identity: string,
		options?: { removeKeys?: boolean; removeDocumentKey?: boolean },
		controller?: string
	): Promise<void>;
}
