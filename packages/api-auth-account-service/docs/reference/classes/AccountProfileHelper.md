# Class: AccountProfileHelper

Helper class for exporting the account data of an account and replacing it with an export.

## Constructors

### Constructor

> **new AccountProfileHelper**(): `AccountProfileHelper`

#### Returns

`AccountProfileHelper`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

***

### DEFAULT\_MAX\_ITEMS {#default_max_items}

> `readonly` `static` **DEFAULT\_MAX\_ITEMS**: `number` = `1000`

The default most items an import may hold.

***

### DEFAULT\_MAX\_BYTES {#default_max_bytes}

> `readonly` `static` **DEFAULT\_MAX\_BYTES**: `number` = `1048576`

The default largest size of the items of an import as JSON, in bytes.

***

### EXCLUDED\_TYPES {#excluded_types}

> `readonly` `static` **EXCLUDED\_TYPES**: `string`[]

The types left out of an export and refused in an import, the identity, organizations and
credentials move with the identity export, and the node migration records stay on the node.

## Methods

### export() {#export}

> `static` **export**(`storage`, `accountId`): `Promise`\<`IAccountProfileExport`\>

Export the account data of an account, other than the excluded types and the items only admins
may see, in creation order.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`AccountData`](AccountData.md)\>

The entity storage for account data.

##### accountId

`string`

The account id.

#### Returns

`Promise`\<`IAccountProfileExport`\>

The export.

***

### import() {#import}

> `static` **import**(`storage`, `accountId`, `profile`, `limits`): `Promise`\<`IAccountProfileImportResult`\>

Replace the account data of an account with an export. The export is checked in full first,
then its items are created, and only then are the existing items of the types it may hold
removed, so a failure leaves the existing items. The types of which the account holds a read
only item, such as a profile owned by an authentication provider, or an item only admins may
see, are left as they are, and read only items in the export are left out. The items only
admins may see are never removed.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`AccountData`](AccountData.md)\>

The entity storage for account data.

##### accountId

`string`

The account id.

##### profile

`IAccountProfileExport`

The export.

##### limits

The limits of an import.

###### maxItems

`number`

The most items an import may hold.

###### maxBytes

`number`

The largest size of the items as JSON, in bytes.

#### Returns

`Promise`\<`IAccountProfileImportResult`\>

What was imported and removed.

#### Throws

UnprocessableError when the export is not valid or too large.

***

### validate() {#validate}

> `static` **validate**(`profile`, `limits`): `Promise`\<`IAccountProfileExportItem`[]\>

Check an export, returning its items with their types normalised.

#### Parameters

##### profile

`IAccountProfileExport`

The export.

##### limits

The limits of an import.

###### maxItems

`number`

The most items an import may hold.

###### maxBytes

`number`

The largest size of the items as JSON, in bytes.

#### Returns

`Promise`\<`IAccountProfileExportItem`[]\>

The items.

#### Throws

UnprocessableError when the export is not valid or too large.
