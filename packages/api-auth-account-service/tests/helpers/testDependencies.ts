// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IAuthorizationComponent } from "@3sixty/authorization-models";
import { ComponentFactory } from "@3sixty/core";
import { MemoryEntityStorageConnector } from "@3sixty/entity-storage-connector-memory";
import type { IEntityStorageConnector } from "@3sixty/entity-storage-models";
import { nameof } from "@3sixty/nameof";
import type { Organization } from "../../src/entities/organization.js";
import { OrganizationHelper } from "../../src/utils/organizationHelper.js";

/**
 * Create the storage for the registered organizations, with the organizations given registered.
 * @param storageKey The key of the memory storage.
 * @param identities The DIDs of the organizations to register.
 * @returns The storage.
 */
export async function createOrganizationStorage(
	storageKey: string,
	identities: string[] = []
): Promise<MemoryEntityStorageConnector<Organization>> {
	const storage = new MemoryEntityStorageConnector<Organization>({
		entitySchema: nameof<Organization>(),
		config: { storageKey }
	});
	for (const identity of identities) {
		await OrganizationHelper.register(storage, identity);
	}
	return storage;
}

/**
 * Create a user storage that holds every account, for tests that do not check the users.
 * @returns The storage.
 */
export function createUserStorage(): IEntityStorageConnector<{ accountId: string }> {
	return {
		className: () => "users",
		query: vi.fn(async () => ({ entities: [{ accountId: "any" }] }))
	} as unknown as IEntityStorageConnector<{ accountId: string }>;
}

/**
 * Create an authorization component where no account holds a role.
 * @returns The component.
 */
export function createAuthorizationComponent(): IAuthorizationComponent {
	return {
		className: () => "authorization",
		hasRoleForSubject: vi.fn(async () => false),
		getRolesForSubject: vi.fn(async () => []),
		addRoleForSubject: vi.fn(),
		removeRoleForSubject: vi.fn(),
		removeAllRolesForSubject: vi.fn()
	} as unknown as IAuthorizationComponent;
}

/**
 * Create an authorization component that holds the roles given, by account id, and changes them.
 * @param roles The roles by account id, changed as roles are added and removed.
 * @param isAdminOfAll Accounts that are an org admin of every organization.
 * @returns The component.
 */
export function createRoleAuthorizationComponent(
	roles: { [subject: string]: string[] },
	isAdminOfAll: string[] = []
): IAuthorizationComponent {
	return {
		className: () => "authorization",
		hasRoleForSubject: vi.fn(
			async (modelId: string, subject: string, role: string) =>
				(roles[subject]?.includes(role) ?? false) ||
				(isAdminOfAll.includes(subject) && role.startsWith("org-admin:"))
		),
		getRolesForSubject: vi.fn(async (modelId: string, subject: string) => roles[subject] ?? []),
		getAllRoles: vi.fn(async () => ({ roles: [...new Set(Object.values(roles).flat())] })),
		getSubjectsForRole: vi.fn(async (modelId: string, role: string) =>
			Object.keys(roles).filter(subject => roles[subject].includes(role))
		),
		addRoleForSubject: vi.fn(async (modelId: string, subject: string, role: string) => {
			roles[subject] = [...(roles[subject] ?? []), role];
		}),
		removeRoleForSubject: vi.fn(async (modelId: string, subject: string, role: string) => {
			roles[subject] = (roles[subject] ?? []).filter(held => held !== role);
		}),
		removeAllRolesForSubject: vi.fn(async (modelId: string, subject: string) => {
			roles[subject] = [];
		})
	} as unknown as IAuthorizationComponent;
}

/**
 * Create a rate component that allows every request.
 * @returns The component.
 */
export function createRateComponent(): {
	className: () => string;
	registerAction: ReturnType<typeof vi.fn>;
	unregisterAction: ReturnType<typeof vi.fn>;
	check: ReturnType<typeof vi.fn>;
	clear: ReturnType<typeof vi.fn>;
} {
	return {
		className: () => "rate",
		registerAction: vi.fn(),
		unregisterAction: vi.fn(),
		check: vi.fn(),
		clear: vi.fn()
	};
}

/**
 * Resolve the required components through the getIfExists mock of the test, so a test replaces a
 * component in one place, falling back to the defaults given.
 * @param defaults The components to return when the test does not give one.
 */
export function mockRequiredComponents(defaults: { [name: string]: unknown }): void {
	vi.spyOn(ComponentFactory, "get").mockImplementation(name => {
		const component = ComponentFactory.getIfExists(name) ?? defaults[name];
		if (component === undefined) {
			throw new Error(`Unexpected component ${name}`);
		}
		return component as never;
	});
}
