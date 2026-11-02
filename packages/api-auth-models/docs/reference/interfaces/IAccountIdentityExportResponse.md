# Interface: IAccountIdentityExportResponse

The identity of the signed in account with its private keys and credentials.

## Properties

### headers? {#headers}

> `optional` **headers?**: `object`

The response headers, the export is never cached.

#### cache-control?

> `optional` **cache-control?**: `string`

Set to no-store.

***

### body {#body}

> **body**: [`IAccountIdentityExport`](IAccountIdentityExport.md)

The export, which contains private keys and must be protected.
