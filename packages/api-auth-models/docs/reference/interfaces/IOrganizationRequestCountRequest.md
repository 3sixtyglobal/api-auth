# Interface: IOrganizationRequestCountRequest

Count the requests to join an organization.

## Properties

### query {#query}

> **query**: `object`

The query parameters for the request.

#### status

> **status**: [`OrganizationRequestStatus`](../type-aliases/OrganizationRequestStatus.md)

The status of the requests to count.

#### filterOrganization?

> `optional` **filterOrganization?**: `string`

The organization of the requests to count, not named organization as the tenant processor
reads that query parameter as the organization of the request.
