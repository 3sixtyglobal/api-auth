# Interface: IAccountDataUpdateRequest

Replace the value of an item of account data.

## Properties

### pathParams {#pathparams}

> **pathParams**: `object`

The path parameters for the request.

#### id

> **id**: `string`

The unique identifier of the item.

***

### body {#body}

> **body**: `object`

The new value.

#### data

> **data**: `unknown`

The new value of the item, a JSON object in the shape of its type.

#### isDefault?

> `optional` **isDefault?**: `boolean`

True to use the item first for its type, clearing any other default, unchanged when omitted.
