# Interface: IOrganizationRequestQueryResponse

The requests to join an organization.

## Properties

### body {#body}

> **body**: `object`

The response body.

#### entities

> **entities**: [`IOrganizationRequestDetails`](IOrganizationRequestDetails.md)[]

The returned requests.

#### cursor?

> `optional` **cursor?**: `string`

The cursor to retrieve the next page, if any.
