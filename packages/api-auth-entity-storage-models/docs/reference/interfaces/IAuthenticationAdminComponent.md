# Interface: IAuthenticationAdminComponent

Contract definition for authentication admin component.

## Extends

- `IComponent`

## Methods

### create() {#create}

> **create**(`user`): `Promise`\<`void`\>

Create a login for the user.

#### Parameters

##### user

[`IAuthenticationUser`](IAuthenticationUser.md) & `object`

The user to create.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the user account has been created.

***

### update() {#update}

> **update**(`user`): `Promise`\<`void`\>

Update a login for the user.

#### Parameters

##### user

`Partial`\<[`IAuthenticationUser`](IAuthenticationUser.md)\>

The user to update.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the user account has been updated.

***

### get() {#get}

> **get**(`email`): `Promise`\<[`IAuthenticationUser`](IAuthenticationUser.md)\>

Get a user by email.

#### Parameters

##### email

`string`

The email address of the user to get.

#### Returns

`Promise`\<[`IAuthenticationUser`](IAuthenticationUser.md)\>

The user details.

***

### getByIdentity() {#getbyidentity}

> **getByIdentity**(`identity`): `Promise`\<[`IAuthenticationUser`](IAuthenticationUser.md)\>

Get a user by identity.

#### Parameters

##### identity

`string`

The identity of the user to get.

#### Returns

`Promise`\<[`IAuthenticationUser`](IAuthenticationUser.md)\>

The user details.

***

### remove() {#remove}

> **remove**(`email`): `Promise`\<`void`\>

Remove a user.

#### Parameters

##### email

`string`

The email address of the user to remove.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the user account has been removed.

***

### updatePassword() {#updatepassword}

> **updatePassword**(`email`, `newPassword`, `currentPassword?`): `Promise`\<`void`\>

Update the user's password.

#### Parameters

##### email

`string`

The email address of the user to update.

##### newPassword

`string`

The new password for the user.

##### currentPassword?

`string`

The current password, optional, if supplied will check against existing.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the password has been updated.
