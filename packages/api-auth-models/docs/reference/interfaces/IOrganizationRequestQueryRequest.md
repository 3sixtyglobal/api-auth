# Interface: IOrganizationRequestQueryRequest

Query the requests to join an organization.

## Properties

### query? {#query}

> `optional` **query?**: `object`

The query parameters for the request.

#### status?

> `optional` **status?**: [`OrganizationRequestStatus`](../type-aliases/OrganizationRequestStatus.md)

The status of the requests to return.

#### filterOrganization?

> `optional` **filterOrganization?**: `string`

The organization of the requests to return, not named organization as the tenant processor
reads that query parameter as the organization of the request.

#### cursor?

> `optional` **cursor?**: `string`

The pagination cursor.

#### limit?

> `optional` **limit?**: `string`

The maximum number of results to return.
