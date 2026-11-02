# Interface: IOrganizationMemberQueryRequest

Query the members of an organization.

## Properties

### pathParams {#pathparams}

> **pathParams**: `object`

The path parameters for the request.

#### id

> **id**: `string`

The unique identifier or the DID of the organization.

***

### query? {#query}

> `optional` **query?**: `object`

The query parameters for the request.

#### cursor?

> `optional` **cursor?**: `string`

The pagination cursor.

#### limit?

> `optional` **limit?**: `string`

The maximum number of results to return.
