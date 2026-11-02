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

[`IAuthenticationUserCreate`](IAuthenticationUserCreate.md)

The user to create.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the user account has been created.

***

### get() {#get}

> **get**(`email`): `Promise`\<[`IAuthenticationUser`](IAuthenticationUser.md)\>

Get a user of any authentication provider.

#### Parameters

##### email

`string`

The email address of the user to get, or the account id.

#### Returns

`Promise`\<[`IAuthenticationUser`](IAuthenticationUser.md)\>

The user details.

***

### getByIdentity() {#getbyidentity}

> **getByIdentity**(`identity`): `Promise`\<[`IAuthenticationUser`](IAuthenticationUser.md)\>

Get the user whose identity is the DID.

#### Parameters

##### identity

`string`

The identity of the user to get.

#### Returns

`Promise`\<[`IAuthenticationUser`](IAuthenticationUser.md)\>

The user details.

***

### update() {#update}

> **update**(`user`): `Promise`\<`void`\>

Update the identity or organization of a user.

#### Parameters

##### user

`Partial`\<[`IAuthenticationUser`](IAuthenticationUser.md)\>

The user to update, found by email address or account id.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the user account has been updated.

***

### remove() {#remove}

> **remove**(`email`): `Promise`\<`void`\>

Remove a user of any authentication provider.

#### Parameters

##### email

`string`

The email address of the user to remove, or the account id.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the user account has been removed.

***

### updatePassword() {#updatepassword}

> **updatePassword**(`email`, `newPassword`): `Promise`\<`void`\>

Set the user's password as an override, without its current password. The caller's own
password is changed through the authentication component instead.

#### Parameters

##### email

`string`

The email address of the user to update, or the account id.

##### newPassword

`string`

The new password for the user.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the password has been updated.

***

### query() {#query}

> **query**(`email?`, `exactEmail?`, `authProviderId?`, `cursor?`, `limit?`): `Promise`\<\{ `entities`: [`IAuthenticationUser`](IAuthenticationUser.md)[]; `cursor?`: `string`; \}\>

Query the users, callers without escalated privilege only see the users of their organization.

#### Parameters

##### email?

`string`

The start of the e-mail address of the users to return, all when omitted.

##### exactEmail?

`boolean`

True to match the e-mail address exactly rather than as a prefix.

##### authProviderId?

`string`

The authentication provider of the users to return, all when omitted.

##### cursor?

`string`

The cursor to request the next page.

##### limit?

`number`

The maximum number of users to return.

#### Returns

`Promise`\<\{ `entities`: [`IAuthenticationUser`](IAuthenticationUser.md)[]; `cursor?`: `string`; \}\>

The users and a cursor when there are more.

***

### disable() {#disable}

> **disable**(`email`): `Promise`\<`void`\>

Disable a user so it cannot sign in, ending its sessions.

#### Parameters

##### email

`string`

The email address of the user to disable, or the account id.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the user has been disabled.

***

### enable() {#enable}

> **enable**(`email`): `Promise`\<`void`\>

Enable a disabled user.

#### Parameters

##### email

`string`

The email address of the user to enable, or the account id.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the user has been enabled.
