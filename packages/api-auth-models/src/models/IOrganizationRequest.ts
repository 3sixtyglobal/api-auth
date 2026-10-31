// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IOrganizationRequestDetails } from "./IOrganizationRequestDetails.js";

/**
 * A request by an account to join an organization. The API models use IOrganizationRequestDetails,
 * as the OpenAPI generator treats a name ending in Request as a request wrapper.
 */
export type IOrganizationRequest = IOrganizationRequestDetails;
