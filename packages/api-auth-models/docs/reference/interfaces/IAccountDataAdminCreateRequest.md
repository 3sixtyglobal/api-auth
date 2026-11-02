# Interface: IAccountDataAdminCreateRequest

Store an item for any account.

## Properties

### body {#body}

> **body**: `object`

The item to store.

#### accountId

> **accountId**: `string`

The account to store the item for.

#### type

> **type**: `string`

The type of the item.

#### data

> **data**: `unknown`

The value of the item, a JSON object in the shape of its type.

#### isDefault?

> `optional` **isDefault?**: `boolean`

True to use the item first for its type, clearing any other default.

#### proof?

> `optional` **proof?**: `IProof`

A proof by the DID over the identity proof document, required when a caller without
escalated privilege stores an identity.

#### adminOnly?

> `optional` **adminOnly?**: `boolean`

True when only admins may see and change the item.
