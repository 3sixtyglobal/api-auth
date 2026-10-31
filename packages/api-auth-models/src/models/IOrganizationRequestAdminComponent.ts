// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IComponent } from "@3sixty/core";
import type { IOrganizationRequest } from "./IOrganizationRequest.js";
import type { IOrganizationRequestCount } from "./IOrganizationRequestCount.js";
import type { OrganizationRequestStatus } from "./organizationRequestStatus.js";

/**
 * Contract for reviewing the requests of accounts to join an organization.
 */
export interface IOrganizationRequestAdminComponent extends IComponent {
	/**
	 * Get a request.
	 * @param id The unique identifier of the request.
	 * @returns The request.
	 * @throws NotFoundError when the request does not exist.
	 */
	get(id: string): Promise<IOrganizationRequest>;

	/**
	 * Query the requests, the earliest first.
	 * @param status The status of the requests to return, all when omitted.
	 * @param organization The organization of the requests to return, all when omitted.
	 * @param cursor The cursor to request the next page.
	 * @param limit The maximum number of requests to return.
	 * @returns The requests and a cursor when there are more.
	 */
	query(
		status?: OrganizationRequestStatus,
		organization?: string,
		cursor?: string,
		limit?: number
	): Promise<{
		entities: IOrganizationRequest[];
		cursor?: string;
	}>;

	/**
	 * Count the requests of a status, up to a cap so counting stays bounded on every storage.
	 * @param status The status of the requests to count.
	 * @param organization The organization of the requests to count, all when omitted.
	 * @returns The number of requests, and whether there are more than the cap.
	 * @throws GuardError when the status is not a request status.
	 */
	countRequests(
		status: OrganizationRequestStatus,
		organization?: string
	): Promise<IOrganizationRequestCount>;

	/**
	 * Accept a pending request, issuing a membership credential from the organization and storing
	 * the organization and the credential as the account data of the account.
	 * @param id The unique identifier of the request.
	 * @returns A promise that resolves when the account has joined the organization.
	 * @throws NotFoundError when the request does not exist.
	 * @throws ConflictError when the request is not pending.
	 */
	accept(id: string): Promise<void>;

	/**
	 * Reject a pending request.
	 * @param id The unique identifier of the request.
	 * @param reason The i18n key of the reason to give the account, for the client to translate.
	 * @returns A promise that resolves when the request has been rejected.
	 * @throws NotFoundError when the request does not exist.
	 * @throws ConflictError when the request is not pending.
	 * @throws UnprocessableError when the reason is not an i18n key.
	 */
	reject(id: string, reason?: string): Promise<void>;

	/**
	 * Remove every request of an account, used when the account is removed.
	 * @param accountId The account id.
	 * @returns A promise that resolves when the requests have been removed.
	 */
	removeForAccount(accountId: string): Promise<void>;
}
