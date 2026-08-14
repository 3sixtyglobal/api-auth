# Interface: IAdminUserUpdateRequest

Update a user as an admin.

## Properties

### pathParams {#pathparams}

> **pathParams**: `object`

The path parameters for the request.

#### email

> **email**: `string`

The user email.

***

### body {#body}

> **body**: `Partial`\<`Omit`\<[`IAuthenticationUser`](IAuthenticationUser.md), `"email"`\>\>

The body of the request.
