# Class: EntityStorageAuthenticationAccountAdminRestClient

The client to connect to the account data administration service, for the data of any account.

## Extends

- `BaseRestClient`

## Implements

- `IAuthenticationAccountAdminComponent`

## Constructors

### Constructor

> **new EntityStorageAuthenticationAccountAdminRestClient**(`config`): `EntityStorageAuthenticationAccountAdminRestClient`

Create a new instance of EntityStorageAuthenticationAccountAdminRestClient.

#### Parameters

##### config

`IBaseRestClientConfig`

The configuration for the client.

#### Returns

`EntityStorageAuthenticationAccountAdminRestClient`

#### Overrides

`BaseRestClient.constructor`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

## Methods

### className() {#classname}

> **className**(): `string`

Returns the class name of the component.

#### Returns

`string`

The class name of the component.

#### Implementation of

`IAuthenticationAccountAdminComponent.className`

***

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

#### Implementation of

`IAuthenticationAccountAdminComponent.create`

***

### get() {#get}

> **get**(`id`): `Promise`\<`IAuthenticationAccountData`\<`unknown`\>\>

Get an item.

#### Parameters

##### id

`string`

The unique identifier of the item.

#### Returns

`Promise`\<`IAuthenticationAccountData`\<`unknown`\>\>

The item.

#### Implementation of

`IAuthenticationAccountAdminComponent.get`

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

#### Implementation of

`IAuthenticationAccountAdminComponent.update`

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

#### Implementation of

`IAuthenticationAccountAdminComponent.remove`

***

### createIdentity() {#createidentity}

> **createIdentity**(`accountId`): `Promise`\<`string`\>

Create an identity with keys the node holds for an account that has none.

#### Parameters

##### accountId

`string`

The account.

#### Returns

`Promise`\<`string`\>

The DID of the account.

#### Implementation of

`IAuthenticationAccountAdminComponent.createIdentity`

***

### exportIdentity() {#exportidentity}

> **exportIdentity**(`accountId`, `sessionStart?`): `Promise`\<`IAccountIdentityExport`\>

Export the identity of an account with its private keys and the credentials it holds.

#### Parameters

##### accountId

`string`

The account.

##### sessionStart?

`number`

When the session started, the server reads it from the token of the request.

#### Returns

`Promise`\<`IAccountIdentityExport`\>

The export, which contains private keys and must be protected.

#### Implementation of

`IAuthenticationAccountAdminComponent.exportIdentity`

***

### importIdentity() {#importidentity}

> **importIdentity**(`accountId`, `exported`): `Promise`\<`IAccountIdentityImportResult`\>

Import a self-controlled identity into an account that has none.

#### Parameters

##### accountId

`string`

The account.

##### exported

`IAccountIdentityExport`

The account identity export file.

#### Returns

`Promise`\<`IAccountIdentityImportResult`\>

The DID and what was imported.

#### Implementation of

`IAuthenticationAccountAdminComponent.importIdentity`

***

### exportProfile() {#exportprofile}

> **exportProfile**(`accountId`): `Promise`\<`IAccountProfileExport`\>

Export the account data of an account.

#### Parameters

##### accountId

`string`

The account.

#### Returns

`Promise`\<`IAccountProfileExport`\>

The export.

#### Implementation of

`IAuthenticationAccountAdminComponent.exportProfile`

***

### importProfile() {#importprofile}

> **importProfile**(`accountId`, `profile`): `Promise`\<`IAccountProfileImportResult`\>

Replace the account data of an account with an export.

#### Parameters

##### accountId

`string`

The account.

##### profile

`IAccountProfileExport`

The account profile export file.

#### Returns

`Promise`\<`IAccountProfileImportResult`\>

What was imported and removed.

#### Implementation of

`IAuthenticationAccountAdminComponent.importProfile`

***

### query() {#query}

> **query**(`accountId?`, `type?`, `cursor?`, `limit?`): `Promise`\<\{ `entities`: `IAuthenticationAccountData`\<`unknown`\>[]; `cursor?`: `string`; \}\>

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

`Promise`\<\{ `entities`: `IAuthenticationAccountData`\<`unknown`\>[]; `cursor?`: `string`; \}\>

The items and a cursor when there are more.

#### Implementation of

`IAuthenticationAccountAdminComponent.query`

***

### getManagedAccounts() {#getmanagedaccounts}

> **getManagedAccounts**(): `Promise`\<`string`[] \| `undefined`\>

Get the accounts the caller may manage.

#### Returns

`Promise`\<`string`[] \| `undefined`\>

The account ids, or undefined when the caller may manage every account.

#### Implementation of

`IAuthenticationAccountAdminComponent.getManagedAccounts`

***

### getRoles() {#getroles}

> **getRoles**(`accountId`): `Promise`\<`string`[]\>

Get the roles of an account.

#### Parameters

##### accountId

`string`

The account.

#### Returns

`Promise`\<`string`[]\>

The roles.

#### Implementation of

`IAuthenticationAccountAdminComponent.getRoles`

***

### getAssignableRoles() {#getassignableroles}

> **getAssignableRoles**(): `Promise`\<`string`[]\>

Get the roles the caller may grant and revoke.

#### Returns

`Promise`\<`string`[]\>

The roles.

#### Implementation of

`IAuthenticationAccountAdminComponent.getAssignableRoles`

***

### addRole() {#addrole}

> **addRole**(`accountId`, `role`): `Promise`\<`void`\>

Grant a role to an account.

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

#### Implementation of

`IAuthenticationAccountAdminComponent.addRole`

***

### removeRole() {#removerole}

> **removeRole**(`accountId`, `role`): `Promise`\<`void`\>

Revoke a role of an account.

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

#### Implementation of

`IAuthenticationAccountAdminComponent.removeRole`
