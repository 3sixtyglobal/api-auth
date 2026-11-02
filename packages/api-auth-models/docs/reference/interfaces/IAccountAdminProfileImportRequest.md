# Interface: IAccountAdminProfileImportRequest

Replace the account data of an account with an export.

## Properties

### pathParams {#pathparams}

> **pathParams**: `object`

The path parameters for the request.

#### accountId

> **accountId**: `string`

The account.

***

### body {#body}

> **body**: [`IAccountProfileExport`](IAccountProfileExport.md)

The account profile export file, as exported.
