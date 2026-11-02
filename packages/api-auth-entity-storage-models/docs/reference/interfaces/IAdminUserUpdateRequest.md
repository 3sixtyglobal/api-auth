# Interface: IAdminUserUpdateRequest

Update a user as an admin.

## Properties

### pathParams {#pathparams}

> **pathParams**: `object`

The path parameters for the request.

#### email

> **email**: `string`

The user email, or the account id.

***

### body {#body}

> **body**: `Partial`\<`Pick`\<[`IAuthenticationUser`](IAuthenticationUser.md), `"userIdentity"` \| `"organizationIdentity"`\>\>

The body of the request.
