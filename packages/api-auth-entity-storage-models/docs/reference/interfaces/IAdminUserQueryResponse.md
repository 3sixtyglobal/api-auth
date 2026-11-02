# Interface: IAdminUserQueryResponse

The users found by an admin query.

## Properties

### body {#body}

> **body**: `object`

The response body.

#### entities

> **entities**: [`IAuthenticationUser`](IAuthenticationUser.md)[]

The returned users.

#### cursor?

> `optional` **cursor?**: `string`

The cursor to retrieve the next page, if any.
