# Interface: IAccountProfileExportItem

An item of account data in a profile export.

## Properties

### type {#type}

> **type**: `string`

The type of the item.

***

### data {#data}

> **data**: `unknown`

The value of the item, a JSON object.

***

### isDefault? {#isdefault}

> `optional` **isDefault?**: `boolean`

True when the item is used first for its type.

***

### dateCreated? {#datecreated}

> `optional` **dateCreated?**: `string`

When the item was created, for information, an imported item is created anew.
