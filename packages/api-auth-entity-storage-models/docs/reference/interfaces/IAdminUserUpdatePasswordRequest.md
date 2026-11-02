# Interface: IAdminUserUpdatePasswordRequest

Update a users password as an admin.

## Properties

### pathParams {#pathparams}

> **pathParams**: `object`

The path parameters for the request.

#### email

> **email**: `string`

The user email, or the account id.

***

### body {#body}

> **body**: `object`

The body of the request.

#### newPassword

> **newPassword**: `string`

The new password for the user.
