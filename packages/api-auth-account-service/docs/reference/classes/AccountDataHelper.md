# Class: AccountDataHelper

Helper class for storing account data, shared by the account and admin services.

## Constructors

### Constructor

> **new AccountDataHelper**(): `AccountDataHelper`

#### Returns

`AccountDataHelper`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

***

### MIGRATION\_TYPE {#migration_type}

> `readonly` `static` **MIGRATION\_TYPE**: `string` = `"migration"`

The type of the records the node migration keeps until its pending work is done.

***

### AVATAR\_CONTENT\_TYPE {#avatar_content_type}

> `readonly` `static` **AVATAR\_CONTENT\_TYPE**: `string` = `AccountImageLimits.AvatarContentType`

The content type of an avatar the account uploads.

***

### AVATAR\_MAX\_BYTES {#avatar_max_bytes}

> `readonly` `static` **AVATAR\_MAX\_BYTES**: `number` = `AccountImageLimits.AvatarMaxBytes`

The largest avatar the account uploads, in decoded bytes.

***

### PROVIDER\_AVATAR\_CONTENT\_TYPES {#provider_avatar_content_types}

> `readonly` `static` **PROVIDER\_AVATAR\_CONTENT\_TYPES**: `string`[]

The content types of an avatar owned by an authentication provider.

***

### PROVIDER\_AVATAR\_MAX\_BYTES {#provider_avatar_max_bytes}

> `readonly` `static` **PROVIDER\_AVATAR\_MAX\_BYTES**: `number` = `1048576`

The largest avatar owned by an authentication provider, in decoded bytes.

***

### AVATAR\_MAX\_DIMENSION {#avatar_max_dimension}

> `readonly` `static` **AVATAR\_MAX\_DIMENSION**: `number` = `AccountImageLimits.MaxDimension`

The largest width and height of an avatar, in pixels.

***

### LOGO\_CONTENT\_TYPES {#logo_content_types}

> `readonly` `static` **LOGO\_CONTENT\_TYPES**: `string`[]

The content types of a logo.

***

### LOGO\_MAX\_BYTES {#logo_max_bytes}

> `readonly` `static` **LOGO\_MAX\_BYTES**: `number` = `AccountImageLimits.LogoMaxBytes`

The largest logo, in decoded bytes.

## Methods

### normaliseType() {#normalisetype}

> `static` **normaliseType**(`type`): `string`

Normalise a type, types are stored in kebab case, so every storage matches a type the same way
whether or not it compares without case, and publicData, PublicData and public_data
are all public-data.

#### Parameters

##### type

`string`

The type.

#### Returns

`string`

The normalised type.

#### Throws

GuardError when the type is empty.

***

### maxInstances() {#maxinstances}

> `static` **maxInstances**(`type`): `number` \| `undefined`

Get the most items of a type an account may hold, from the verifier registered for the type.

#### Parameters

##### type

`string`

The type of the item.

#### Returns

`number` \| `undefined`

The most items, or undefined when the type has no verifier or no limit.

***

### validateData() {#validatedata}

> `static` **validateData**(`type`, `data`, `accountOwned?`): `Promise`\<`void`\>

Check the value of an item with the verifier registered for its type, such as the identity,
organization, verifiable credential, logo, avatar and public data verifiers the node registers,
and as a JSON object for a type with no verifier.

#### Parameters

##### type

`string`

The type of the item.

##### data

`unknown`

The value of the item.

##### accountOwned?

`boolean`

True when the account sets the value itself, so it may not mark it read only.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the value is valid.

#### Throws

UnprocessableError when the value is not valid for the type.

***

### buildPublicData() {#buildpublicdata}

> `static` **buildPublicData**(`storage`, `owner`, `identifier?`, `extraPaths?`): `Promise`\<`IJsonLdNodeObject`[]\>

Build the public data of an owner, an account or the DID of an organization, from the paths of
its public data item, a JSON-LD object for each type the paths name, from the item of that type
to use first. The items only admins may see and the node migration records are never included.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`AccountData`](AccountData.md)\>

The entity storage for account data.

##### owner

`string`

The account id, or the DID of an organization.

##### identifier?

`string`

The DID of the owner, added to each object that has no identifier.

##### extraPaths?

`string`[]

Paths always included, such as the name of an organization in a search.

#### Returns

`Promise`\<`IJsonLdNodeObject`[]\>

The public JSON-LD objects.

***

### hasAdminOnly() {#hasadminonly}

> `static` **hasAdminOnly**(`storage`, `accountId`, `type`): `Promise`\<`boolean`\>

Check whether an account holds an item of a type that only admins may see and change.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`AccountData`](AccountData.md)\>

The entity storage for account data.

##### accountId

`string`

The account id.

##### type

`string`

The type of the items.

#### Returns

`Promise`\<`boolean`\>

True when it does.

***

### isType() {#istype}

> `static` **isType**(`type`, ...`types`): `boolean`

Check whether a type is one of a list of types once normalised, so a variant of a reserved
type is treated as reserved.

#### Parameters

##### type

`string`

The type.

##### types

...`string`[]

The types to match, in their normalised form.

#### Returns

`boolean`

True when the type matches one of the types.

***

### guardIdentityAvailable() {#guardidentityavailable}

> `static` **guardIdentityAvailable**(`storage`, `organizationStorage`, `identity`): `Promise`\<`void`\>

Ensure a DID may be bound to an account, it must not be the node, the organization of the
tenant or node, a registered organization, or held by an account.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`AccountData`](AccountData.md)\>

The entity storage for account data.

##### organizationStorage

`IEntityStorageConnector`\<[`Organization`](Organization.md)\>

The entity storage for the registered organizations.

##### identity

`string`

The DID.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the DID is available.

#### Throws

ConflictError when the DID is held.

***

### create() {#create}

> `static` **create**(`storage`, `accountId`, `type`, `data`, `isDefault?`, `id?`, `options?`): `Promise`\<`string`\>

Store an item for an account.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`AccountData`](AccountData.md)\>

The entity storage for account data.

##### accountId

`string`

The account to store the item for.

##### type

`string`

The type of the item, stored normalised.

##### data

`unknown`

The value of the item.

##### isDefault?

`boolean`

True to use the item first for its type, clearing any other default.

##### id?

`string`

The unique identifier to use, a new one is generated when omitted.

##### options?

Checks the caller has already made.

###### hasNoItems?

`boolean`

True when the account is known to hold no item of the type, so there
is no default to clear.

###### revocationIndex?

`number`

The revocation index of the membership credential the node
issued for an organization item.

###### adminOnly?

`boolean`

True when only admins may see and change the item.

#### Returns

`Promise`\<`string`\>

The unique identifier of the item.

***

### identityId() {#identityid}

> `static` **identityId**(`identity`): `string`

Get the unique identifier of the identity item for a DID, the same for every account so a DID
can only be held by one account.

#### Parameters

##### identity

`string`

The DID.

#### Returns

`string`

The unique identifier of the item.

***

### identityLockKey() {#identitylockkey}

> `static` **identityLockKey**(`accountId`): `string`

Get the key of the lock that serialises binding an identity to an account.

#### Parameters

##### accountId

`string`

The account id.

#### Returns

`string`

The lock key.

***

### didLockKey() {#didlockkey}

> `static` **didLockKey**(`identity`): `string`

Get the key of the lock that serialises binding a DID, so two accounts can not bind it at once.
Always taken after the lock of the account.

#### Parameters

##### identity

`string`

The DID.

#### Returns

`string`

The lock key.

***

### count() {#count}

> `static` **count**(`storage`, `accountId`, `type?`): `Promise`\<`number`\>

Count the items of an account, optionally of a type.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`AccountData`](AccountData.md)\>

The entity storage for account data.

##### accountId

`string`

The account id.

##### type?

`string`

The type of the items, all types when omitted.

#### Returns

`Promise`\<`number`\>

The number of items.

***

### getRevocationIndex() {#getrevocationindex}

> `static` **getRevocationIndex**(`storage`, `id`): `Promise`\<`number` \| `undefined`\>

Get the revocation index the node recorded for the membership credential of an organization item.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`AccountData`](AccountData.md)\>

The entity storage for account data.

##### id

`string`

The unique identifier of the organization item.

#### Returns

`Promise`\<`number` \| `undefined`\>

The index, or undefined when none was recorded.

***

### setRevocationIndex() {#setrevocationindex}

> `static` **setRevocationIndex**(`storage`, `id`, `revocationIndex`): `Promise`\<`void`\>

Record the revocation index of the membership credential the node issued for an organization item.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`AccountData`](AccountData.md)\>

The entity storage for account data.

##### id

`string`

The unique identifier of the organization item.

##### revocationIndex

`number`

The index.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the index has been recorded.

#### Throws

NotFoundError when the item does not exist.

***

### createIdentity() {#createidentity}

> `static` **createIdentity**(`storage`, `accountId`, `identity`, `options?`): `Promise`\<`string`\>

Store the identity of an account, an account has only one and a DID is held by only one account.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`AccountData`](AccountData.md)\>

The entity storage for account data.

##### accountId

`string`

The account to store the identity for.

##### identity

`string`

The DID.

##### options?

Checks the caller has already made, so they are not repeated.

###### accountChecked?

`boolean`

True when the account was found to have no identity while
holding its identity lock.

###### availabilityChecked?

`boolean`

True when the DID was found not to be held by an account, or
was just created.

#### Returns

`Promise`\<`string`\>

The unique identifier of the item.

#### Throws

ConflictError when the account already has an identity or the DID is held by an account.

***

### guardNoIdentity() {#guardnoidentity}

> `static` **guardNoIdentity**(`storage`, `accountId`): `Promise`\<`void`\>

Ensure an account has no identity yet.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`AccountData`](AccountData.md)\>

The entity storage for account data.

##### accountId

`string`

The account id.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the account has no identity.

#### Throws

ConflictError when the account already has an identity.

***

### get() {#get}

> `static` **get**(`storage`, `id`, `accountId?`): `Promise`\<`IAuthenticationAccountData`\<`unknown`\>\>

Get an item, optionally only when it belongs to an account.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`AccountData`](AccountData.md)\>

The entity storage for account data.

##### id

`string`

The unique identifier of the item.

##### accountId?

`string`

The account the item must belong to, any account when omitted.

#### Returns

`Promise`\<`IAuthenticationAccountData`\<`unknown`\>\>

The item.

#### Throws

NotFoundError when the item does not exist or belongs to another account.

***

### update() {#update}

> `static` **update**(`storage`, `id`, `data`, `isDefault?`, `accountId?`): `Promise`\<`void`\>

Replace the value of an item, optionally only when it belongs to an account.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`AccountData`](AccountData.md)\>

The entity storage for account data.

##### id

`string`

The unique identifier of the item.

##### data

`unknown`

The new value of the item.

##### isDefault?

`boolean`

True to use the item first for its type, clearing any other default, unchanged when omitted.

##### accountId?

`string`

The account the item must belong to, any account when omitted.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the item has been updated.

#### Throws

NotFoundError when the item does not exist or belongs to another account.

***

### updateItem() {#updateitem}

> `static` **updateItem**(`storage`, `item`, `data`, `isDefault?`, `adminOnly?`): `Promise`\<`void`\>

Replace the value of an item the caller has already read and checked the owner of.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`AccountData`](AccountData.md)\>

The entity storage for account data.

##### item

`IAuthenticationAccountData`

The item as read.

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

***

### remove() {#remove}

> `static` **remove**(`storage`, `id`, `accountId?`): `Promise`\<`void`\>

Remove an item, optionally only when it belongs to an account.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`AccountData`](AccountData.md)\>

The entity storage for account data.

##### id

`string`

The unique identifier of the item.

##### accountId?

`string`

The account the item must belong to, any account when omitted.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the item has been removed.

#### Throws

NotFoundError when the item does not exist or belongs to another account.

***

### removeItem() {#removeitem}

> `static` **removeItem**(`storage`, `item`): `Promise`\<`void`\>

Remove an item the caller has already read and checked the owner of.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`AccountData`](AccountData.md)\>

The entity storage for account data.

##### item

`IAuthenticationAccountData`

The item as read.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the item has been removed.

***

### query() {#query}

> `static` **query**(`storage`, `accountId?`, `type?`, `cursor?`, `limit?`, `excludeTypes?`, `excludeAdminOnly?`): `Promise`\<\{ `entities`: `IAuthenticationAccountData`\<`unknown`\>[]; `cursor?`: `string`; \}\>

Query items, filtered by account and type.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`AccountData`](AccountData.md)\>

The entity storage for account data.

##### accountId?

`string` \| `string`[]

The account, or accounts, of the items to return, all accounts when omitted.

##### type?

`string`

The type of the items to return, all types when omitted.

##### cursor?

`string`

The cursor to request the next page.

##### limit?

`number`

The maximum number of items to return.

##### excludeTypes?

`string`[]

The types to leave out when no type is given.

##### excludeAdminOnly?

`boolean`

True to leave out the items only admins may see.

#### Returns

`Promise`\<\{ `entities`: `IAuthenticationAccountData`\<`unknown`\>[]; `cursor?`: `string`; \}\>

The items and a cursor when there are more.

***

### getDefault() {#getdefault}

> `static` **getDefault**(`storage`, `accountId`, `type`): `Promise`\<`IAuthenticationAccountData`\<`unknown`\> \| `undefined`\>

Get the item of a type to use first for an account, the default item, otherwise the earliest created.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`AccountData`](AccountData.md)\>

The entity storage for account data.

##### accountId

`string`

The account id.

##### type

`string`

The type of the item.

#### Returns

`Promise`\<`IAuthenticationAccountData`\<`unknown`\> \| `undefined`\>

The item, or undefined when the account has none of the type.

***

### queryAll() {#queryall}

> `static` **queryAll**(`storage`, `accountId`, `type`): `Promise`\<`IAuthenticationAccountData`\<`unknown`\>[]\>

Read every item of a type of an account.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`AccountData`](AccountData.md)\>

The entity storage for account data.

##### accountId

`string`

The account id.

##### type

`string`

The type of the items.

#### Returns

`Promise`\<`IAuthenticationAccountData`\<`unknown`\>[]\>

The items.

***

### replaceSingle() {#replacesingle}

> `static` **replaceSingle**(`storage`, `accountId`, `type`, `data`, `existing?`): `Promise`\<`string`\>

Store the item of a type an account holds one of, replacing the value of the one it has, so it
stays the default. Any other item of the type is removed.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`AccountData`](AccountData.md)\>

The entity storage for account data.

##### accountId

`string`

The account id.

##### type

`string`

The type of the item.

##### data

`unknown`

The value of the item.

##### existing?

`IAuthenticationAccountData`\<`unknown`\>[]

The items of the type the caller has already read, read here when omitted.

#### Returns

`Promise`\<`string`\>

The unique identifier of the item.

***

### hasOrganizationItem() {#hasorganizationitem}

> `static` **hasOrganizationItem**(`storage`, `organization`, `accountId?`): `Promise`\<`boolean`\>

Check whether there is an organization item for an organization, through its indexed column.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`AccountData`](AccountData.md)\>

The entity storage for account data.

##### organization

`string`

The DID of the organization.

##### accountId?

`string`

The account of the item, any account when omitted.

#### Returns

`Promise`\<`boolean`\>

True when an item exists.

***

### isCredential() {#iscredential}

> `static` **isCredential**(`data`): `boolean`

Check the value of a verifiable credential item, a JSON credential object with a context, the
VerifiableCredential type, an issuer, a credential subject and a proof.

#### Parameters

##### data

`unknown`

The value.

#### Returns

`boolean`

True when it is valid.

***

### isDid() {#isdid}

> `static` **isDid**(`value`): `boolean`

Check a value is a well formed DID.

#### Parameters

##### value

`unknown`

The value.

#### Returns

`boolean`

True when it is.

***

### checkImage() {#checkimage}

> `static` **checkImage**(`data`, `contentTypes`, `maxBytes`): `"invalid"` \| `"tooLarge"` \| `undefined`

Check an image, a schema.org ImageObject holding a base64 data URL of one of the content types,
up to the size given.

#### Parameters

##### data

`unknown`

The value.

##### contentTypes

`string`[]

The content types allowed.

##### maxBytes

`number`

The largest image, in decoded bytes.

#### Returns

`"invalid"` \| `"tooLarge"` \| `undefined`

Why the image is refused, or undefined when it is valid.
