# Interface: IAccountProfileImportResult

The result of importing account data, which replaces the items of the types it may hold.

## Properties

### itemsImported {#itemsimported}

> **itemsImported**: `number`

The number of items created from the import.

***

### itemsRemoved {#itemsremoved}

> **itemsRemoved**: `number`

The number of existing items removed.

***

### skippedTypes {#skippedtypes}

> **skippedTypes**: `string`[]

The types whose items in the import were left out, as the account holds a read only item of
the type or the item was read only.
