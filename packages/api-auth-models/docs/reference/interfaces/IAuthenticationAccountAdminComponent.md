# Interface: IAuthenticationAccountAdminComponent

Contract for managing the data stored for any account.

## Extends

- `IComponent`

## Methods

### create() {#create}

> **create**(`accountId`, `type`, `data`, `isDefault?`, `proof?`, `adminOnly?`): `Promise`\<`string`\>

Store an item for an account.

#### Parameters

##### accountId

`string`

The account to store the item for.

##### type

`string`

The type of the item.

##### data

`unknown`

The value of the item.

##### isDefault?

`boolean`

True to use the item first for its type, clearing any other default.

##### proof?

`IProof`

A proof by the DID over the identity proof document, required when a caller
without escalated privilege stores an identity.

##### adminOnly?

`boolean`

True when only admins may see and change the item.

#### Returns

`Promise`\<`string`\>

The unique identifier of the item.

***

### get() {#get}

> **get**(`id`): `Promise`\<[`IAuthenticationAccountData`](IAuthenticationAccountData.md)\<`unknown`\>\>

Get an item.

#### Parameters

##### id

`string`

The unique identifier of the item.

#### Returns

`Promise`\<[`IAuthenticationAccountData`](IAuthenticationAccountData.md)\<`unknown`\>\>

The item.

#### Throws

NotFoundError when the item does not exist.

***

### update() {#update}

> **update**(`id`, `data`, `isDefault?`, `adminOnly?`): `Promise`\<`void`\>

Replace the value of an item.

#### Parameters

##### id

`string`

The unique identifier of the item.

##### data

`unknown`

The new value of the item.

##### isDefault?

`boolean`

True to use the item first for its type, clearing any other default, unchanged when omitted.

##### adminOnly?

`boolean`

True when only admins may see and change the item, unchanged when omitted.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the item has been updated.

#### Throws

NotFoundError when the item does not exist.

***

### getManagedAccounts() {#getmanagedaccounts}

> **getManagedAccounts**(): `Promise`\<`string`[] \| `undefined`\>

Get the accounts the caller may manage, callers without escalated privilege only manage the
members of the organizations they are an org admin of.

#### Returns

`Promise`\<`string`[] \| `undefined`\>

The account ids, or undefined when the caller may manage every account.

***

### getRoles() {#getroles}

> **getRoles**(`accountId`): `Promise`\<`string`[]\>

Get the roles of an account the caller manages.

#### Parameters

##### accountId

`string`

The account.

#### Returns

`Promise`\<`string`[]\>

The roles.

#### Throws

NotFoundError when the caller does not manage the account.

***

### getAssignableRoles() {#getassignableroles}

> **getAssignableRoles**(): `Promise`\<`string`[]\>

Get the roles the caller may grant and revoke, every role for a caller holding escalated
privilege, otherwise the roles it holds other than the escalated privilege role. The org admin
roles are never included, they are managed through the organization.

#### Returns

`Promise`\<`string`[]\>

The roles.

***

### addRole() {#addrole}

> **addRole**(`accountId`, `role`): `Promise`\<`void`\>

Grant a role to an account the caller manages.

#### Parameters

##### accountId

`string`

The account.

##### role

`string`

The role.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the role has been granted.

#### Throws

NotFoundError when the caller does not manage the account.

#### Throws

ForbiddenError when the caller may not grant the role to the account.

#### Throws

UnprocessableError when the role is an org admin role.

***

### removeRole() {#removerole}

> **removeRole**(`accountId`, `role`): `Promise`\<`void`\>

Revoke a role of an account the caller manages.

#### Parameters

##### accountId

`string`

The account.

##### role

`string`

The role.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the role has been revoked.

#### Throws

NotFoundError when the caller does not manage the account.

#### Throws

ForbiddenError when the caller may not revoke the role of the account.

#### Throws

UnprocessableError when the role is an org admin role.

#### Throws

ConflictError when the escalated privilege role is revoked from its last holder.

***

### remove() {#remove}

> **remove**(`id`): `Promise`\<`void`\>

Remove an item.

#### Parameters

##### id

`string`

The unique identifier of the item.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the item has been removed.

#### Throws

NotFoundError when the item does not exist.

***

### createIdentity() {#createidentity}

> **createIdentity**(`accountId`): `Promise`\<`string`\>

Create a self-controlled identity with keys the node holds for an account that has none, as
the account does itself.

#### Parameters

##### accountId

`string`

The account.

#### Returns

`Promise`\<`string`\>

The DID of the account.

#### Throws

ConflictError when the account already has an identity.

***

### exportIdentity() {#exportidentity}

> **exportIdentity**(`accountId`, `sessionStart?`): `Promise`\<[`IAccountIdentityExport`](IAccountIdentityExport.md)\>

Export the identity of an account with its private keys and the credentials it holds, which
needs a recent sign in by the caller.

#### Parameters

##### accountId

`string`

The account.

##### sessionStart?

`number`

When the session of the caller started in seconds, it must be recent.

#### Returns

`Promise`\<[`IAccountIdentityExport`](IAccountIdentityExport.md)\>

The export, which contains private keys and must be protected.

#### Throws

NotFoundError when the account has no identity.

#### Throws

UnprocessableError when the node does not hold the keys of the identity.

***

### importIdentity() {#importidentity}

> **importIdentity**(`accountId`, `exported`): `Promise`\<[`IAccountIdentityImportResult`](IAccountIdentityImportResult.md)\>

Import a self-controlled identity into an account that has none, as the account does itself.

#### Parameters

##### accountId

`string`

The account.

##### exported

[`IAccountIdentityExport`](IAccountIdentityExport.md)

The account identity export file.

#### Returns

`Promise`\<[`IAccountIdentityImportResult`](IAccountIdentityImportResult.md)\>

The DID and what was imported.

#### Throws

UnprocessableError when the file is not an account identity export or is not valid.

#### Throws

ConflictError when the account already has an identity, or the DID is held.

***

### exportProfile() {#exportprofile}

> **exportProfile**(`accountId`): `Promise`\<[`IAccountProfileExport`](IAccountProfileExport.md)\>

Export the account data of an account, as the account does itself.

#### Parameters

##### accountId

`string`

The account.

#### Returns

`Promise`\<[`IAccountProfileExport`](IAccountProfileExport.md)\>

The export.

***

### importProfile() {#importprofile}

> **importProfile**(`accountId`, `profile`): `Promise`\<[`IAccountProfileImportResult`](IAccountProfileImportResult.md)\>

Replace the account data of an account with an export, as the account does itself.

#### Parameters

##### accountId

`string`

The account.

##### profile

[`IAccountProfileExport`](IAccountProfileExport.md)

The account profile export file.

#### Returns

`Promise`\<[`IAccountProfileImportResult`](IAccountProfileImportResult.md)\>

What was imported and removed.

#### Throws

UnprocessableError when the file is not an account profile export or is not valid.

***

### query() {#query}

> **query**(`accountId?`, `type?`, `cursor?`, `limit?`): `Promise`\<\{ `entities`: [`IAuthenticationAccountData`](IAuthenticationAccountData.md)\<`unknown`\>[]; `cursor?`: `string`; \}\>

Query the items of any account.

#### Parameters

##### accountId?

`string`

The account of the items to return, all accounts when omitted.

##### type?

`string`

The type of the items to return, all types when omitted.

##### cursor?

`string`

The cursor to request the next page.

##### limit?

`number`

The maximum number of items to return.

#### Returns

`Promise`\<\{ `entities`: [`IAuthenticationAccountData`](IAuthenticationAccountData.md)\<`unknown`\>[]; `cursor?`: `string`; \}\>

The items and a cursor when there are more.
