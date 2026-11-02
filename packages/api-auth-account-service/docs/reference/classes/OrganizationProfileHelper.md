# Class: OrganizationProfileHelper

Helper class for the profile, logo and public data of an organization, shared by the organization
service and the account service that creates an organization for the signed in account.

## Constructors

### Constructor

> **new OrganizationProfileHelper**(): `OrganizationProfileHelper`

#### Returns

`OrganizationProfileHelper`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

## Methods

### load() {#load}

> `static` **load**(`storage`, `identity`): `Promise`\<`Pick`\<`IOrganization`, `"profile"` \| `"logo"` \| `"publicData"`\>\>

Read the profile, logo and public data of an organization.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`AccountData`](AccountData.md)\>

The entity storage for account data.

##### identity

`string`

The DID of the organization.

#### Returns

`Promise`\<`Pick`\<`IOrganization`, `"profile"` \| `"logo"` \| `"publicData"`\>\>

The profile, logo and public data.

***

### validate() {#validate}

> `static` **validate**(`changes`): `Promise`\<`void`\>

Check the changes before anything is stored.

#### Parameters

##### changes

`IOrganizationProfileUpdate`

The changes.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the changes are valid.

#### Throws

UnprocessableError when the profile, logo or public data is not valid.

***

### store() {#store}

> `static` **store**(`storage`, `identity`, `changes`, `isNew`): `Promise`\<`void`\>

Store the changes as the default account data of the DID, replacing the existing items, a
null logo removes it.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`AccountData`](AccountData.md)\>

The entity storage for account data.

##### identity

`string`

The DID of the organization.

##### changes

`IOrganizationProfileUpdate`

The changes, checked first.

##### isNew

`boolean`

True when the DID was just created, so it has no items to replace.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the changes have been stored.

#### Throws

UnprocessableError when the profile, logo or public data is not valid.

***

### removeAll() {#removeall}

> `static` **removeAll**(`storage`, `identity`): `Promise`\<`void`\>

Remove the account data of an organization, keeping the revocation index it reached for when
its DID is registered again.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`AccountData`](AccountData.md)\>

The entity storage for account data.

##### identity

`string`

The DID of the organization.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the items have been removed.
