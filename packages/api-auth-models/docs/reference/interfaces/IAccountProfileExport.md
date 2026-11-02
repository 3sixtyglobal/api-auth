# Interface: IAccountProfileExport

The account data of an account, other than its identity, organizations, credentials and node
migration records, which move with the identity export.

## Properties

### type {#type}

> **type**: `"account-profile"`

The type of the file, checked first when it is imported.

***

### version {#version}

> **version**: `number`

The version of the file.

***

### items {#items}

> **items**: [`IAccountProfileExportItem`](IAccountProfileExportItem.md)[]

The items in the order they were created.
