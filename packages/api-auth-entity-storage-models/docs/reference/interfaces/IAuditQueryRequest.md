# Interface: IAuditQueryRequest

Query authentication audit entries.

## Properties

### query? {#query}

> `optional` **query?**: `object`

The query parameters for the request.

#### actorId?

> `optional` **actorId?**: `string`

The actor identifier to filter by.

#### organizationId?

> `optional` **organizationId?**: `string`

The organization identifier to filter by.

#### tenantId?

> `optional` **tenantId?**: `string`

The tenant identifier to filter by.

#### nodeId?

> `optional` **nodeId?**: `string`

The node identifier to filter by.

#### event?

> `optional` **event?**: `string`

The event to filter by.

#### startDate?

> `optional` **startDate?**: `string`

The inclusive start date for filtering, in ISO 8601 format.

#### endDate?

> `optional` **endDate?**: `string`

The inclusive end date for filtering, in ISO 8601 format.

#### cursor?

> `optional` **cursor?**: `string`

The pagination cursor.

#### limit?

> `optional` **limit?**: `string`

The maximum number of results to return.
