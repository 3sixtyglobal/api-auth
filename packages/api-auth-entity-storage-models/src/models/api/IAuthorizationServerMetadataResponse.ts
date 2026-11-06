// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuthorizationServerMetadata } from "../IAuthorizationServerMetadata.js";

/**
 * The OAuth 2.0 authorization server metadata of the node.
 */
export interface IAuthorizationServerMetadataResponse {
	/**
	 * The response details.
	 */
	body: IAuthorizationServerMetadata;
}
