// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import { entity, property } from "@twin.org/entity";

/**
 * Class defining the storage for authentication rate entries.
 */
@entity()
export class AuthenticationRateEntry {
	/**
	 * The id for the rate entry.
	 */
	@property({ type: "string", isPrimary: true, maxLength: 255 })
	public id!: string;

	/**
	 * Array of ISO date strings representing timestamps of failed attempts.
	 */
	@property({ type: "array", itemType: "string" })
	public timestamps!: string[];

	/**
	 * Last modification time in ISO date format.
	 */
	@property({ type: "string", format: "date-time" })
	public dateModified!: string;
}
