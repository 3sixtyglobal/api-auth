// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { ContextIdKeys, ContextIdStore } from "@3sixty/context";
import { ComponentFactory, ConflictError, NotFoundError, UnprocessableError } from "@3sixty/core";
import { MemoryEntityStorageConnector } from "@3sixty/entity-storage-connector-memory";
import { EntityStorageConnectorFactory } from "@3sixty/entity-storage-models";
import type { IIdentityComponent } from "@3sixty/identity-models";
import { nameof } from "@3sixty/nameof";
import type { AccountData } from "../../src/entities/accountData.js";
import type { OrganizationRequest } from "../../src/entities/organizationRequest.js";
import { initSchema } from "../../src/schema.js";
import { EntityStorageAuthenticationAccountService } from "../../src/services/entityStorageAuthenticationAccountService.js";
import { EntityStorageOrganizationRequestAdminService } from "../../src/services/entityStorageOrganizationRequestAdminService.js";
import { AccountDataHelper } from "../../src/utils/accountDataHelper.js";
import { OrganizationRequestHelper } from "../../src/utils/organizationRequestHelper.js";
import { membershipCredential, organizationData } from "../helpers/accountDataValues.js";

initSchema();

const ORGANIZATION = "did:example:organization";

/**
 * The membership credential the mock identity component issues.
 */
const MEMBERSHIP_CREDENTIAL = membershipCredential(ORGANIZATION, {
	id: "did:example:member",
	memberOf: { id: ORGANIZATION }
});

/**
 * Run a function as a signed in account.
 * @param accountId The account id.
 * @param fn The function to run.
 * @returns The result of the function.
 */
async function asAccount<T>(accountId: string, fn: () => Promise<T>): Promise<T> {
	return ContextIdStore.run({ [ContextIdKeys.Account]: accountId }, fn);
}

describe("organization requests", () => {
	let accountData: MemoryEntityStorageConnector<AccountData>;
	let requests: MemoryEntityStorageConnector<OrganizationRequest>;
	let identityComponent: IIdentityComponent;
	let service: EntityStorageAuthenticationAccountService;
	let admin: EntityStorageOrganizationRequestAdminService;

	beforeEach(async () => {
		accountData = new MemoryEntityStorageConnector<AccountData>({
			entitySchema: nameof<AccountData>(),
			config: { storageKey: "account-data-organization" }
		});
		requests = new MemoryEntityStorageConnector<OrganizationRequest>({
			entitySchema: nameof<OrganizationRequest>(),
			config: { storageKey: "organization-request" }
		});
		vi.spyOn(EntityStorageConnectorFactory, "get").mockImplementation(name => {
			if (name === "organization-request") {
				return requests;
			}
			return accountData;
		});
		identityComponent = {
			verifiableCredentialCreate: vi.fn().mockResolvedValue({
				verifiableCredential: MEMBERSHIP_CREDENTIAL,
				jwt: "membership.credential.jwt"
			})
		} as unknown as IIdentityComponent;
		vi.spyOn(ComponentFactory, "get").mockReturnValue(identityComponent);

		service = new EntityStorageAuthenticationAccountService();
		admin = new EntityStorageOrganizationRequestAdminService();

		await AccountDataHelper.createIdentity(accountData, "account-1", "did:example:user");
	});

	afterEach(async () => {
		vi.restoreAllMocks();
		await accountData.teardown();
		await requests.teardown();
	});

	/**
	 * Ask to join the organization as account-1 and return the pending request.
	 * @returns The request id.
	 */
	async function requestToJoin(): Promise<string> {
		await asAccount("account-1", async () => service.joinOrganization(ORGANIZATION));
		const pending = await admin.query("pending", ORGANIZATION);
		return pending.entities[0].id;
	}

	it("should store a pending request and report no organization while it is pending", async () => {
		const id = await requestToJoin();

		await expect(admin.get(id)).resolves.toMatchObject({
			accountId: "account-1",
			organization: ORGANIZATION,
			status: "pending"
		});
		await expect(asAccount("account-1", async () => service.getOrganization())).resolves.toBe(
			undefined
		);
	});

	it("should refuse a second pending request for the same organization", async () => {
		await requestToJoin();

		await expect(
			asAccount("account-1", async () => service.joinOrganization(ORGANIZATION))
		).rejects.toMatchObject({
			name: "ConflictError",
			message: "entityStorageAuthenticationAccountService.organizationRequestPending"
		});
	});

	it("should require the account to have an identity and be signed in", async () => {
		await expect(
			asAccount("account-2", async () => service.joinOrganization(ORGANIZATION))
		).rejects.toThrow(UnprocessableError);
		await expect(service.joinOrganization(ORGANIZATION)).rejects.toThrow();
		await expect(service.getOrganization()).rejects.toThrow();
	});

	it("should issue a membership credential and store the organization when accepted", async () => {
		const id = await requestToJoin();

		await admin.accept(id);

		expect(identityComponent.verifiableCredentialCreate).toHaveBeenCalledWith(
			`${ORGANIZATION}#trust-assertion`,
			undefined,
			{
				"@context": "https://schema.org",
				"@type": "Person",
				id: "did:example:user",
				memberOf: { "@type": "Organization", id: ORGANIZATION }
			},
			// An unregistered organization has no counter, so no revocation index.
			{ revocationIndex: undefined, types: ["OrganizationMembershipCredential"] },
			ORGANIZATION
		);
		await expect(admin.get(id)).resolves.toMatchObject({ status: "accepted" });
		await expect(asAccount("account-1", async () => service.getOrganization())).resolves.toBe(
			ORGANIZATION
		);

		const credentials = await AccountDataHelper.query(accountData, "account-1", "vc");
		// The JSON credential with its proof is stored, not the JWT.
		expect(credentials.entities.map(e => e.data)).toEqual([MEMBERSHIP_CREDENTIAL]);
		const organizations = await AccountDataHelper.query(accountData, "account-1", "organization");
		expect(organizations.entities).toMatchObject([
			{ data: organizationData(ORGANIZATION), isDefault: true }
		]);

		// Once joined the account cannot ask again.
		await expect(
			asAccount("account-1", async () => service.joinOrganization(ORGANIZATION))
		).rejects.toMatchObject({
			message: "entityStorageAuthenticationAccountService.organizationAlreadyJoined"
		});
	});

	it("should use the configured verification method", async () => {
		admin = new EntityStorageOrganizationRequestAdminService({
			config: { verificationMethodId: "membership" }
		});
		const id = await requestToJoin();

		await admin.accept(id);

		expect(vi.mocked(identityComponent.verifiableCredentialCreate).mock.calls[0][0]).toBe(
			`${ORGANIZATION}#membership`
		);
	});

	it("should tell the account the request was rejected, with the reason", async () => {
		const id = await requestToJoin();

		await admin.reject(id, "organizationRequest.reason.notAMember");

		await expect(admin.get(id)).resolves.toMatchObject({
			status: "rejected",
			reason: "organizationRequest.reason.notAMember"
		});
		await expect(
			asAccount("account-1", async () => service.getOrganization())
		).rejects.toMatchObject({
			name: "UnprocessableError",
			message: "entityStorageAuthenticationAccountService.organizationRequestRejected",
			properties: { organization: ORGANIZATION, reason: "organizationRequest.reason.notAMember" }
		});

		// A new request replaces the rejection while it is pending.
		await asAccount("account-1", async () => service.joinOrganization(ORGANIZATION));
		await expect(asAccount("account-1", async () => service.getOrganization())).resolves.toBe(
			undefined
		);
	});

	it("should only take an i18n key as the rejection reason", async () => {
		const id = await requestToJoin();

		await expect(admin.reject(id, "Not a member of staff")).rejects.toMatchObject({
			name: "UnprocessableError",
			message: "entityStorageOrganizationRequestAdminService.reasonNotI18nKey"
		});
		await expect(admin.reject(id, "")).rejects.toThrow(UnprocessableError);
		await expect(admin.get(id)).resolves.toMatchObject({ status: "pending" });
	});

	it("should only accept or reject a pending request", async () => {
		const id = await requestToJoin();
		await admin.reject(id);

		await expect(admin.accept(id)).rejects.toThrow(ConflictError);
		await expect(admin.reject(id)).rejects.toThrow(ConflictError);
		await expect(admin.get("missing")).rejects.toThrow(NotFoundError);
	});

	it("should not accept a request for an account that no longer has an identity", async () => {
		const id = await requestToJoin();
		await accountData.remove(AccountDataHelper.identityId("did:example:user"));

		await expect(admin.accept(id)).rejects.toThrow(UnprocessableError);
		expect(identityComponent.verifiableCredentialCreate).not.toHaveBeenCalled();
		await expect(admin.get(id)).resolves.toMatchObject({ status: "pending" });
	});

	it("should let the account see the status of its request", async () => {
		await expect(
			asAccount("account-1", async () => service.getOrganizationRequest())
		).resolves.toBeUndefined();

		const id = await requestToJoin();
		await expect(
			asAccount("account-1", async () => service.getOrganizationRequest())
		).resolves.toMatchObject({ id, organization: ORGANIZATION, status: "pending" });

		await admin.reject(id, "organizationRequest.reason.notAMember");
		await expect(
			asAccount("account-1", async () => service.getOrganizationRequest())
		).resolves.toMatchObject({
			id,
			status: "rejected",
			reason: "organizationRequest.reason.notAMember"
		});

		// A new request is the one shown while it is pending.
		await asAccount("account-1", async () => service.joinOrganization(ORGANIZATION));
		await expect(
			asAccount("account-1", async () => service.getOrganizationRequest())
		).resolves.toMatchObject({ status: "pending" });

		// Another account does not see the request.
		await expect(
			asAccount("account-2", async () => service.getOrganizationRequest())
		).resolves.toBeUndefined();
		await expect(service.getOrganizationRequest()).rejects.toThrow();
	});

	it("should let the account cancel every pending request, keeping those answered before", async () => {
		await AccountDataHelper.createIdentity(accountData, "account-2", "did:example:user-2");
		const first = await requestToJoin();
		await admin.reject(first, "organizationRequest.reason.notAMember");
		await asAccount("account-1", async () => service.joinOrganization(ORGANIZATION));
		await asAccount("account-1", async () => service.joinOrganization("did:example:other"));
		await asAccount("account-2", async () => service.joinOrganization(ORGANIZATION));

		await asAccount("account-1", async () => service.cancelOrganizationRequest());

		// Both pending requests are gone, the rejection is the status again.
		expect((await admin.query(undefined, undefined)).entities).toMatchObject([
			{ id: first, status: "rejected" },
			{ accountId: "account-2", status: "pending" }
		]);
		await expect(
			asAccount("account-1", async () => service.getOrganizationRequest())
		).resolves.toMatchObject({ id: first, status: "rejected" });
		await expect(
			asAccount("account-1", async () => service.getOrganization())
		).rejects.toMatchObject({
			message: "entityStorageAuthenticationAccountService.organizationRequestRejected"
		});

		await expect(
			asAccount("account-1", async () => service.cancelOrganizationRequest())
		).rejects.toMatchObject({
			name: NotFoundError.CLASS_NAME,
			message: "organizationRequestHelper.organizationRequestNotFound"
		});
		await expect(service.cancelOrganizationRequest()).rejects.toThrow();
	});

	it("should count the requests of a status, by organization, up to a cap", async () => {
		await AccountDataHelper.createIdentity(accountData, "account-2", "did:example:user-2");
		await AccountDataHelper.createIdentity(accountData, "account-3", "did:example:user-3");
		const first = await requestToJoin();
		await asAccount("account-2", async () => service.joinOrganization(ORGANIZATION));
		await asAccount("account-3", async () => service.joinOrganization("did:example:other"));
		await admin.reject(first);

		await expect(admin.countRequests("pending")).resolves.toEqual({ count: 2, capped: false });
		await expect(admin.countRequests("pending", ORGANIZATION)).resolves.toEqual({
			count: 1,
			capped: false
		});
		await expect(admin.countRequests("rejected", ORGANIZATION)).resolves.toEqual({
			count: 1,
			capped: false
		});
		await expect(admin.countRequests("accepted")).resolves.toEqual({ count: 0, capped: false });

		// Past the cap the count stops at it.
		await expect(
			OrganizationRequestHelper.count(requests, "pending", undefined, 1)
		).resolves.toEqual({ count: 1, capped: true });
		await expect(
			OrganizationRequestHelper.count(requests, "pending", undefined, 2)
		).resolves.toEqual({ count: 2, capped: false });
		expect(OrganizationRequestHelper.COUNT_CAP).toBe(1000);

		await expect(admin.countRequests("unknown" as never)).rejects.toMatchObject({
			name: "GuardError"
		});
	});

	it("should remove every request of an account", async () => {
		await AccountDataHelper.createIdentity(accountData, "account-2", "did:example:user-2");
		const first = await requestToJoin();
		await admin.reject(first);
		await asAccount("account-1", async () => service.joinOrganization(ORGANIZATION));
		await asAccount("account-2", async () => service.joinOrganization(ORGANIZATION));

		await admin.removeForAccount("account-1");

		expect((await admin.query()).entities).toMatchObject([{ accountId: "account-2" }]);
		await expect(asAccount("account-1", async () => service.getOrganization())).resolves.toBe(
			undefined
		);
		await expect(admin.removeForAccount("")).rejects.toThrow();
	});

	it("should query the requests by status and organization", async () => {
		await AccountDataHelper.createIdentity(accountData, "account-2", "did:example:user-2");
		const first = await requestToJoin();
		await asAccount("account-2", async () => service.joinOrganization("did:example:other"));
		await admin.reject(first);

		expect((await admin.query()).entities).toHaveLength(2);
		expect((await admin.query("pending")).entities).toMatchObject([
			{ accountId: "account-2", organization: "did:example:other" }
		]);
		expect((await admin.query(undefined, ORGANIZATION)).entities).toMatchObject([
			{ id: first, status: "rejected" }
		]);
	});

	describe("tenant wide admins", () => {
		let tenantWide: EntityStorageOrganizationRequestAdminService;

		/**
		 * Run a function as an admin, by default without escalated privilege.
		 * @param fn The function to run.
		 * @param accountId The account of the admin.
		 * @returns The result of the function.
		 */
		async function asAdmin<T>(fn: () => Promise<T>, accountId: string = "user-admin"): Promise<T> {
			return ContextIdStore.run(
				{ [ContextIdKeys.Account]: accountId, [ContextIdKeys.UserOrganization]: ORGANIZATION },
				fn
			);
		}

		beforeEach(async () => {
			const authorization = {
				className: () => "authorization",
				hasRoleForSubject: async (modelId: string, subject: string, role: string) =>
					role === "global-admin" && ["global-admin", "account-2"].includes(subject)
			};
			vi.spyOn(ComponentFactory, "getIfExists").mockImplementation(name => {
				if (name === "authorization") {
					return authorization;
				}
				return undefined;
			});
			tenantWide = new EntityStorageOrganizationRequestAdminService();
			await AccountDataHelper.createIdentity(accountData, "account-2", "did:example:user-2");
			await AccountDataHelper.createIdentity(accountData, "account-3", "did:example:user-3");
			await asAccount("account-1", async () => service.joinOrganization(ORGANIZATION));
			await asAccount("account-3", async () => service.joinOrganization("did:example:other"));
		});

		it("should let a caller without escalated privilege review the requests of any organization", async () => {
			const all = await tenantWide.query("pending");
			const own = all.entities.find(r => r.organization === ORGANIZATION)?.id ?? "";
			const other = all.entities.find(r => r.organization !== ORGANIZATION)?.id ?? "";

			await asAdmin(async () => {
				expect((await tenantWide.query("pending")).entities).toHaveLength(2);
				await expect(tenantWide.query("pending", "did:example:other")).resolves.toMatchObject({
					entities: [{ accountId: "account-3" }]
				});
				await expect(tenantWide.get(other)).resolves.toMatchObject({ accountId: "account-3" });
				await tenantWide.accept(other);
				await tenantWide.reject(own, "organizationRequest.reason.notAMember");
			});

			expect((await tenantWide.get(other)).status).toBe("accepted");
			expect((await tenantWide.get(own)).status).toBe("rejected");
		});

		it("should only let a caller with escalated privilege accept or remove the requests of an escalated account", async () => {
			await asAccount("account-2", async () => service.joinOrganization(ORGANIZATION));
			const pending = await tenantWide.query("pending");
			const escalated = pending.entities.find(r => r.accountId === "account-2")?.id ?? "";

			await asAdmin(async () => {
				await expect(tenantWide.accept(escalated)).rejects.toMatchObject({
					name: "ForbiddenError",
					message: "entityStorageOrganizationRequestAdminService.insufficientRoleForEscalatedTarget"
				});
				await expect(tenantWide.removeForAccount("account-2")).rejects.toMatchObject({
					name: "ForbiddenError"
				});
				await tenantWide.removeForAccount("account-3");
			});
			await asAdmin(async () => tenantWide.accept(escalated), "global-admin");

			expect((await tenantWide.query()).entities).toMatchObject([
				{ accountId: "account-1" },
				{ accountId: "account-2", status: "accepted" }
			]);
		});

		it("should not let a caller without escalated privilege accept their own request", async () => {
			const pending = await tenantWide.query("pending", ORGANIZATION);
			const own = pending.entities[0].id;

			await asAdmin(async () => {
				await expect(tenantWide.accept(own)).rejects.toMatchObject({
					name: "ForbiddenError",
					message: "entityStorageOrganizationRequestAdminService.ownAccountNotPermitted"
				});
			}, "account-1");
			expect((await tenantWide.get(own)).status).toBe("pending");

			await asAdmin(async () => tenantWide.accept(own), "global-admin");
			expect((await tenantWide.get(own)).status).toBe("accepted");
		});
	});
});
