# Interface: IOrganizationIdentityExportResponse

The identity of an organization with its private keys.

## Properties

### headers? {#headers}

> `optional` **headers?**: `object`

The response headers, the export is never cached.

#### cache-control?

> `optional` **cache-control?**: `string`

Set to no-store.

***

### body {#body}

> **body**: [`IOrganizationIdentityExport`](IOrganizationIdentityExport.md)

The export, which contains private keys and must be protected.
