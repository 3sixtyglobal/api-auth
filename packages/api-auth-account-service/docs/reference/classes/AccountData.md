# Class: AccountData

Class defining the storage for an item of account data.

## Constructors

### Constructor

> **new AccountData**(): `AccountData`

#### Returns

`AccountData`

## Properties

### id {#id}

> **id**: `string`

The unique identifier of the item.

***

### accountId {#accountid}

> **accountId**: `string`

The account the item belongs to.

***

### type {#type}

> **type**: `string`

The type of the item, such as identity or profile, stored in kebab case.

***

### data {#data}

> **data**: `unknown`

The value of the item, a JSON object.

***

### organization? {#organization}

> `optional` **organization?**: `string`

The DID of the organization for an organization item, so the members of an organization can be
queried, as the value is not.

***

### revocationIndex? {#revocationindex}

> `optional` **revocationIndex?**: `number`

The revocation index the node allocated for the membership credential it issued for an
organization item, so the credential can be revoked when the membership ends. Only written by
the node and never returned.

***

### adminOnly? {#adminonly}

> `optional` **adminOnly?**: `boolean`

True when only admins may see and change the item, old items read as false.

***

### isDefault {#isdefault}

> **isDefault**: `boolean`

True for the item of its type to use first, otherwise the earliest created item is used.

***

### dateCreated {#datecreated}

> **dateCreated**: `string`

When the item was created, in ISO date format.

***

### dateModified {#datemodified}

> **dateModified**: `string`

When the item was last modified, in ISO date format.
