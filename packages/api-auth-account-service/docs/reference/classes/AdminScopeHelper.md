# Class: AdminScopeHelper

Helper class for the roles of the caller of the admin services. Callers holding escalated
privilege act across the whole tenant, other admins only on the members of the organizations they
are an org admin of, and accounts holding escalated privilege are protected from callers without it.

## Constructors

### Constructor

> **new AdminScopeHelper**(): `AdminScopeHelper`

#### Returns

`AdminScopeHelper`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

## Methods

### callerAccount() {#calleraccount}

> `static` **callerAccount**(): `Promise`\<`string` \| `undefined`\>

Get the account of the caller.

#### Returns

`Promise`\<`string` \| `undefined`\>

The account id, or undefined for a system call such as from the node CLI.

***

### callerIsEscalated() {#callerisescalated}

> `static` **callerIsEscalated**(`authorizationComponent`, `authorizationModelId`, `escalatedPrivilegeRole`): `Promise`\<`boolean`\>

Check whether the caller holds escalated privilege, calls with no caller account are system
calls and hold it. Roles are held by account ids, so a DID grants no privilege.

#### Parameters

##### authorizationComponent

`IAuthorizationComponent`

The authorization component.

##### authorizationModelId

`string`

The authorization model ID used to look up roles.

##### escalatedPrivilegeRole

`string`

The role that grants escalated privilege.

#### Returns

`Promise`\<`boolean`\>

True when the caller holds escalated privilege.

***

### callerIsAdmin() {#callerisadmin}

> `static` **callerIsAdmin**(`authorizationComponent`, `authorizationModelId`, `escalatedPrivilegeRole`, `adminRole`): `Promise`\<`boolean`\>

Check whether the caller holds escalated privilege or the admin role.

#### Parameters

##### authorizationComponent

`IAuthorizationComponent`

The authorization component.

##### authorizationModelId

`string`

The authorization model ID used to look up roles.

##### escalatedPrivilegeRole

`string`

The role that grants escalated privilege.

##### adminRole

`string`

The admin role.

#### Returns

`Promise`\<`boolean`\>

True when the caller is an admin.

***

### callerMayChange() {#callermaychange}

> `static` **callerMayChange**(`authorizationComponent`, `authorizationModelId`, `escalatedPrivilegeRole`, `accountId`): `Promise`\<`boolean`\>

Check whether the caller may change an account, an account holding escalated privilege may
only be changed by a caller holding it.

#### Parameters

##### authorizationComponent

`IAuthorizationComponent`

The authorization component.

##### authorizationModelId

`string`

The authorization model ID used to look up roles.

##### escalatedPrivilegeRole

`string`

The role that grants escalated privilege.

##### accountId

`string`

The account being changed.

#### Returns

`Promise`\<`boolean`\>

True when the caller may change the account.

***

### managedOrganizations() {#managedorganizations}

> `static` **managedOrganizations**(`authorizationComponent`, `authorizationModelId`, `escalatedPrivilegeRole`, `adminRoles`): `Promise`\<`string`[] \| `undefined`\>

Get the organizations the caller manages.

#### Parameters

##### authorizationComponent

`IAuthorizationComponent`

The authorization component.

##### authorizationModelId

`string`

The authorization model ID used to look up roles.

##### escalatedPrivilegeRole

`string`

The role that grants escalated privilege.

##### adminRoles

[`OrganizationAdminRoles`](OrganizationAdminRoles.md)

The org admin roles.

#### Returns

`Promise`\<`string`[] \| `undefined`\>

The DIDs of the organizations the caller is an org admin of, or undefined when the
caller holds escalated privilege and manages every organization.

***

### managedAccounts() {#managedaccounts}

> `static` **managedAccounts**(`storage`, `authorizationComponent`, `authorizationModelId`, `escalatedPrivilegeRole`, `adminRoles`): `Promise`\<`string`[] \| `undefined`\>

Get the accounts the caller manages, the members of the organizations it is an org admin of.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`AccountData`](AccountData.md)\>

The entity storage for account data.

##### authorizationComponent

`IAuthorizationComponent`

The authorization component.

##### authorizationModelId

`string`

The authorization model ID used to look up roles.

##### escalatedPrivilegeRole

`string`

The role that grants escalated privilege.

##### adminRoles

[`OrganizationAdminRoles`](OrganizationAdminRoles.md)

The org admin roles.

#### Returns

`Promise`\<`string`[] \| `undefined`\>

The account ids, or undefined when the caller holds escalated privilege and manages
every account.

***

### callerManages() {#callermanages}

> `static` **callerManages**(`storage`, `authorizationComponent`, `authorizationModelId`, `escalatedPrivilegeRole`, `adminRoles`, `accountId`): `Promise`\<`boolean`\>

Check whether the caller manages an account, a caller holding escalated privilege manages every
account, others the members of the organizations they are an org admin of.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`AccountData`](AccountData.md)\>

The entity storage for account data.

##### authorizationComponent

`IAuthorizationComponent`

The authorization component.

##### authorizationModelId

`string`

The authorization model ID used to look up roles.

##### escalatedPrivilegeRole

`string`

The role that grants escalated privilege.

##### adminRoles

[`OrganizationAdminRoles`](OrganizationAdminRoles.md)

The org admin roles.

##### accountId

`string`

The account.

#### Returns

`Promise`\<`boolean`\>

True when the caller manages the account.

***

### isMember() {#ismember}

> `static` **isMember**(`storage`, `accountId`, `organization`): `Promise`\<`boolean`\>

Check whether an account is in an organization.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`AccountData`](AccountData.md)\>

The entity storage for account data.

##### accountId

`string`

The account id.

##### organization

`string`

The DID of the organization.

#### Returns

`Promise`\<`boolean`\>

True when the account has an organization item for the organization.
