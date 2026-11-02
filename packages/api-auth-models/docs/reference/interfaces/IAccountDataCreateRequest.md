# Interface: IAccountDataCreateRequest

Store an item for the signed in account.

## Properties

### body {#body}

> **body**: `object`

The item to store.

#### type

> **type**: `string`

The type of the item.

#### data

> **data**: `unknown`

The value of the item, a JSON object in the shape of its type.

#### isDefault?

> `optional` **isDefault?**: `boolean`

True to use the item first for its type, clearing any other default.
