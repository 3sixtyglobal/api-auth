# Class: OrganizationHelper

Helper class for the organizations registered on the node, shared by the services and the node
migration.

## Constructors

### Constructor

> **new OrganizationHelper**(): `OrganizationHelper`

#### Returns

`OrganizationHelper`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

***

### RETIRED\_REVOCATION\_INDEX\_TYPE {#retired_revocation_index_type}

> `readonly` `static` **RETIRED\_REVOCATION\_INDEX\_TYPE**: `string` = `"organization-revocation-index"`

The type of the account data item, owned by the DID of a removed organization, that keeps the
revocation index it reached.

## Methods

### findByIdentity() {#findbyidentity}

> `static` **findByIdentity**(`storage`, `identity`): `Promise`\<[`Organization`](Organization.md) \| `undefined`\>

Find an organization by its DID.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`Organization`](Organization.md)\>

The entity storage for the organizations.

##### identity

`string`

The DID of the organization.

#### Returns

`Promise`\<[`Organization`](Organization.md) \| `undefined`\>

The organization, or undefined when it is not registered.

***

### find() {#find}

> `static` **find**(`storage`, `id`): `Promise`\<[`Organization`](Organization.md) \| `undefined`\>

Find an organization by its unique identifier or its DID.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`Organization`](Organization.md)\>

The entity storage for the organizations.

##### id

`string`

The unique identifier or the DID of the organization.

#### Returns

`Promise`\<[`Organization`](Organization.md) \| `undefined`\>

The organization, or undefined when it is not registered.

***

### register() {#register}

> `static` **register**(`storage`, `identity`, `searchName?`, `identityHeld?`, `nextRevocationIndex?`): `Promise`\<\{ `organization`: [`Organization`](Organization.md); `created`: `boolean`; \}\>

Register an organization for a DID, returning the existing one when the DID is registered, so
a repeated call does not add another.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`Organization`](Organization.md)\>

The entity storage for the organizations.

##### identity

`string`

The DID of the organization.

##### searchName?

`string`

The search name of a created organization, from searchName, empty when omitted.

##### identityHeld?

`boolean`

True when the node created or imported the DID, so its keys are removed
with the organization.

##### nextRevocationIndex?

`number`

The revocation index a created organization starts from, zero when
omitted.

#### Returns

`Promise`\<\{ `organization`: [`Organization`](Organization.md); `created`: `boolean`; \}\>

The organization and whether it was created.

***

### updateOrganization() {#updateorganization}

> `static` **updateOrganization**(`storage`, `identity`, `change`): `Promise`\<[`Organization`](Organization.md) \| `undefined`\>

Change a registered organization, reading it by id just before the write so the change is made
to the latest stored value. The last write wins.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`Organization`](Organization.md)\>

The entity storage for the organizations.

##### identity

`string`

The DID of the organization.

##### change

(`organization`) => [`Organization`](Organization.md)

Returns the organization with the change made.

#### Returns

`Promise`\<[`Organization`](Organization.md) \| `undefined`\>

The organization as stored, or undefined when it is not registered.

***

### allocateRevocationIndex() {#allocaterevocationindex}

> `static` **allocateRevocationIndex**(`storage`, `identity`): `Promise`\<`number` \| `undefined`\>

Allocate the revocation index of a membership credential an organization issues, from a
counter held with the organization, so every credential it issues has its own index.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`Organization`](Organization.md)\>

The entity storage for the organizations.

##### identity

`string`

The DID of the organization.

#### Returns

`Promise`\<`number` \| `undefined`\>

The index, or undefined when the organization is not registered.

***

### retiredRevocationIndexId() {#retiredrevocationindexid}

> `static` **retiredRevocationIndexId**(`identity`): `string`

Get the unique identifier of the account data item that keeps the revocation index an
organization reached once it is removed, the same for every registration of its DID.

#### Parameters

##### identity

`string`

The DID of the organization.

#### Returns

`string`

The unique identifier of the item.

***

### getRetiredRevocationIndex() {#getretiredrevocationindex}

> `static` **getRetiredRevocationIndex**(`accountDataStorage`, `identity`): `Promise`\<`number` \| `undefined`\>

Get the revocation index an organization reached when its DID was last removed, so registering
the DID again never gives a credential an index the DID has already used.

#### Parameters

##### accountDataStorage

`IEntityStorageConnector`\<[`AccountData`](AccountData.md)\>

The entity storage for account data.

##### identity

`string`

The DID of the organization.

#### Returns

`Promise`\<`number` \| `undefined`\>

The index, or undefined when the DID was never removed with credentials issued.

***

### retireRevocationIndex() {#retirerevocationindex}

> `static` **retireRevocationIndex**(`accountDataStorage`, `identity`, `nextRevocationIndex`): `Promise`\<`void`\>

Keep the revocation index an organization reached, when it is removed, unless a higher index
is already kept.

#### Parameters

##### accountDataStorage

`IEntityStorageConnector`\<[`AccountData`](AccountData.md)\>

The entity storage for account data.

##### identity

`string`

The DID of the organization.

##### nextRevocationIndex

`number` \| `undefined`

The revocation index the next credential would have been given.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the index is kept.

***

### searchName() {#searchname}

> `static` **searchName**(`profile`): `string`

Get the search name of a profile, its name in lower case.

#### Parameters

##### profile

`unknown`

The profile.

#### Returns

`string`

The search name, empty when the profile has no name.

***

### storeSearchName() {#storesearchname}

> `static` **storeSearchName**(`storage`, `organization`, `profile`): `Promise`\<[`Organization`](Organization.md)\>

Store the search name of an organization from its profile, when it has changed.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`Organization`](Organization.md)\>

The entity storage for the organizations.

##### organization

[`Organization`](Organization.md)

The organization.

##### profile

`unknown`

The profile.

#### Returns

`Promise`\<[`Organization`](Organization.md)\>

The organization as stored.

***

### createNodeIdentity() {#createnodeidentity}

> `static` **createNodeIdentity**(`identityComponent`, `nodeIdentity`, `verificationMethodId`): `Promise`\<`string`\>

Create a DID controlled by the node for an organization, with the verification method that signs
membership credentials.

#### Parameters

##### identityComponent

`IIdentityComponent`

The identity component.

##### nodeIdentity

`string`

The DID of the node, the controller.

##### verificationMethodId

`string`

The verification method to add.

#### Returns

`Promise`\<`string`\>

The DID.

#### Throws

GeneralError when the DID can not be created.

***

### guardRegistered() {#guardregistered}

> `static` **guardRegistered**(`storage`, `identity`): `Promise`\<`void`\>

Ensure an organization DID is registered, so accounts can only join registered organizations.
The organization of the tenant, or of the node when single tenant, is always accepted.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`Organization`](Organization.md)\>

The entity storage for the organizations.

##### identity

`string`

The DID of the organization.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the organization is registered.

#### Throws

NotFoundError when the organization is not registered.
