# Interface: IAccountAdminIdentityImportRequest

Import an identity into an account that has none.

## Properties

### pathParams {#pathparams}

> **pathParams**: `object`

The path parameters for the request.

#### accountId

> **accountId**: `string`

The account.

***

### body {#body}

> **body**: [`IAccountIdentityExport`](IAccountIdentityExport.md)

The account identity export file, as exported.
