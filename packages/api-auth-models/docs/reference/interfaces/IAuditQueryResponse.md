# Interface: IAuditQueryResponse

Response from querying authentication audit entries.

## Properties

### body {#body}

> **body**: `object`

The response body.

#### entries

> **entries**: [`IAuthenticationAuditEntry`](IAuthenticationAuditEntry.md)[]

The returned audit entries.

#### cursor?

> `optional` **cursor?**: `string`

The cursor to retrieve the next page, if any.
