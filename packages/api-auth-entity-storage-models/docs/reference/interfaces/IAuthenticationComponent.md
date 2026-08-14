# Interface: IAuthenticationComponent

Contract definition for authentication component.

## Extends

- `IComponent`

## Methods

### login() {#login}

> **login**(`email`, `password`): `Promise`\<\{ `token?`: `string`; `expiry`: `number`; \}\>

Perform a login for the user.

#### Parameters

##### email

`string`

The email address for the user.

##### password

`string`

The password for the user.

#### Returns

`Promise`\<\{ `token?`: `string`; `expiry`: `number`; \}\>

The authentication token for the user, if it uses a mechanism with public access.

***

### logout() {#logout}

> **logout**(`token?`): `Promise`\<`void`\>

Logout the current user.

#### Parameters

##### token?

`string`

The token to logout, if it uses a mechanism with public access.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the logout has been completed.

***

### refresh() {#refresh}

> **refresh**(`token?`): `Promise`\<\{ `token?`: `string`; `expiry`: `number`; \}\>

Refresh the token.

#### Parameters

##### token?

`string`

The token to refresh, if it uses a mechanism with public access.

#### Returns

`Promise`\<\{ `token?`: `string`; `expiry`: `number`; \}\>

The refreshed token, if it uses a mechanism with public access.

***

### updatePassword() {#updatepassword}

> **updatePassword**(`currentPassword`, `newPassword`): `Promise`\<`void`\>

Update the user's password.

#### Parameters

##### currentPassword

`string`

The current password for the user.

##### newPassword

`string`

The new password for the user.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the password has been updated.
