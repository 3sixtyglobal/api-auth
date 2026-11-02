# Interface: IAccountProfileExportResponse

The account data of the signed in account.

## Properties

### headers? {#headers}

> `optional` **headers?**: `object`

The response headers, the export is never cached.

#### cache-control?

> `optional` **cache-control?**: `string`

Set to no-store.

***

### body {#body}

> **body**: [`IAccountProfileExport`](IAccountProfileExport.md)

The export.
