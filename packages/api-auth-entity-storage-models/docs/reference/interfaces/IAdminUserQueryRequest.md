# Interface: IAdminUserQueryRequest

Query the users as an admin.

## Properties

### query? {#query}

> `optional` **query?**: `object`

The query parameters for the request.

#### email?

> `optional` **email?**: `string`

The start of the e-mail address of the users to return.

#### exactEmail?

> `optional` **exactEmail?**: `string`

True to match the e-mail address exactly rather than as a prefix.

#### authProviderId?

> `optional` **authProviderId?**: `string`

The authentication provider of the users to return.

#### cursor?

> `optional` **cursor?**: `string`

The pagination cursor.

#### limit?

> `optional` **limit?**: `string`

The maximum number of results to return.
