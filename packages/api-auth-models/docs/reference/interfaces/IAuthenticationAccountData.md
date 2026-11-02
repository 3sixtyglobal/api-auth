# Interface: IAuthenticationAccountData\<T\>

An item of data stored for an account.

## Type Parameters

### T {#t}

`T` = `unknown`

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

> **data**: `T`

The value of the item, a JSON object in the shape of its type.

***

### isDefault {#isdefault}

> **isDefault**: `boolean`

True for the item of its type to use first, otherwise the earliest created item is used.

***

### adminOnly? {#adminonly}

> `optional` **adminOnly?**: `boolean`

True when only admins may see and change the item, only present in admin responses.

***

### dateCreated {#datecreated}

> **dateCreated**: `string`

When the item was created, in ISO date format.

***

### dateModified {#datemodified}

> **dateModified**: `string`

When the item was last modified, in ISO date format.
