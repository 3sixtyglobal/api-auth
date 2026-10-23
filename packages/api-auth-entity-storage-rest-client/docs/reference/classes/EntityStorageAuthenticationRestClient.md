# Class: EntityStorageAuthenticationRestClient

The client to connect to the authentication service.

## Extends

- `BaseRestClient`

## Implements

- `IAuthenticationComponent`

## Constructors

### Constructor

> **new EntityStorageAuthenticationRestClient**(`config`): `EntityStorageAuthenticationRestClient`

Create a new instance of EntityStorageAuthenticationRestClient.

#### Parameters

##### config

[`IEntityStorageAuthenticationRestClientConstructorOptions`](../interfaces/IEntityStorageAuthenticationRestClientConstructorOptions.md)

The configuration for the client.

#### Returns

`EntityStorageAuthenticationRestClient`

#### Overrides

`BaseRestClient.constructor`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

## Methods

### className() {#classname}

> **className**(): `string`

Returns the class name of the component.

#### Returns

`string`

The class name of the component.

#### Implementation of

`IAuthenticationComponent.className`

***

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

#### Implementation of

`IAuthenticationComponent.login`

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

A promise that resolves when the logout request has completed.

#### Implementation of

`IAuthenticationComponent.logout`

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

#### Implementation of

`IAuthenticationComponent.refresh`

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

A promise that resolves when the password has been updated on the server.

#### Implementation of

`IAuthenticationComponent.updatePassword`

***

### passwordPolicy() {#passwordpolicy}

> **passwordPolicy**(): `Promise`\<`IPasswordOptions`\>

Get the password policy used for password validation.

#### Returns

`Promise`\<`IPasswordOptions`\>

The password policy options.

#### Implementation of

`IAuthenticationComponent.passwordPolicy`
