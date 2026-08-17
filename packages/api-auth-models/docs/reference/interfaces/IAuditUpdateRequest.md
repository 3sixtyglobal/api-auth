# Interface: IAuditUpdateRequest

Update an authentication audit entry.

## Properties

### pathParams {#pathparams}

> **pathParams**: `object`

The path parameters for the request.

#### id

> **id**: `string`

The audit entry id.

***

### body {#body}

> **body**: `Partial`\<`Omit`\<[`IAuthenticationAuditEntry`](IAuthenticationAuditEntry.md), `"id"` \| `"dateCreated"`\>\>

The body of the request.
