# Class: PasswordHelper

Helper class for password operations.

## Constructors

### Constructor

> **new PasswordHelper**(): `PasswordHelper`

#### Returns

`PasswordHelper`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

## Methods

### updatePassword() {#updatepassword}

> `static` **updatePassword**(`userEntityStorage`, `authenticationAuditService`, `user`, `newPassword`, `currentPassword?`, `minPasswordLength?`): `Promise`\<`void`\>

Update the password for a user.
Validates password strength, verifies the current password if provided, then hashes and stores the new password and raises an audit event.

#### Parameters

##### userEntityStorage

`IEntityStorageConnector`\<[`AuthenticationUser`](AuthenticationUser.md)\>

The entity storage for users.

##### authenticationAuditService

`IAuthenticationAuditComponent` \| `undefined`

The optional audit service.

##### user

[`AuthenticationUser`](AuthenticationUser.md)

The user whose password is being updated.

##### newPassword

`string`

The new password to set.

##### currentPassword?

`string`

The current password to verify against, if supplied.

##### minPasswordLength?

`number`

Optional minimum password length for validation.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the new password has been stored and the audit entry recorded.
