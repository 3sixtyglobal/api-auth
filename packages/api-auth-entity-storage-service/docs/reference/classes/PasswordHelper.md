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

***

### ALGORITHM\_ARGON2ID {#algorithm_argon2id}

> `readonly` `static` **ALGORITHM\_ARGON2ID**: `string` = `"argon2id"`

The algorithm stored with Argon2id password hashes.

***

### DEFAULT\_ITERATIONS {#default_iterations}

> `readonly` `static` **DEFAULT\_ITERATIONS**: `number` = `2`

The default Argon2id iterations.

***

### DEFAULT\_MEMORY\_KIB {#default_memory_kib}

> `readonly` `static` **DEFAULT\_MEMORY\_KIB**: `number` = `19456`

The default Argon2id memory in kibibytes.

***

### DEFAULT\_PARALLELISM {#default_parallelism}

> `readonly` `static` **DEFAULT\_PARALLELISM**: `number` = `1`

The default Argon2id parallelism.

## Methods

### hashPassword() {#hashpassword}

> `static` **hashPassword**(`password`, `hashOptions?`): `Promise`\<`Required`\<`Pick`\<[`AuthenticationUser`](AuthenticationUser.md), `"password"` \| `"salt"` \| `"passwordAlgorithm"` \| `"passwordHashParameters"`\>\>\>

Hash a password with Argon2id and a new salt.

#### Parameters

##### password

`string`

The password.

##### hashOptions?

`IPasswordHashOptions`

The Argon2id parameters.

#### Returns

`Promise`\<`Required`\<`Pick`\<[`AuthenticationUser`](AuthenticationUser.md), `"password"` \| `"salt"` \| `"passwordAlgorithm"` \| `"passwordHashParameters"`\>\>\>

The fields to store on the account.

***

### verifyPassword() {#verifypassword}

> `static` **verifyPassword**(`user`, `password`): `Promise`\<`boolean`\>

Check a password against the hash stored on an account, legacy Blake2b hashes included, in
constant time.

#### Parameters

##### user

[`AuthenticationUser`](AuthenticationUser.md)

The account.

##### password

`string`

The password to check.

#### Returns

`Promise`\<`boolean`\>

True when the password matches.

***

### dummyVerify() {#dummyverify}

> `static` **dummyVerify**(`password`, `hashOptions?`): `Promise`\<`void`\>

Hash a password that is not checked against anything, so a sign in for an unknown account takes
as long as one for a known account.

#### Parameters

##### password

`string`

The password.

##### hashOptions?

`IPasswordHashOptions`

The Argon2id parameters.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the hash has been computed.

***

### needsRehash() {#needsrehash}

> `static` **needsRehash**(`user`, `hashOptions?`): `boolean`

Check whether the password hash of an account should be replaced, as it is a legacy hash or
uses other parameters.

#### Parameters

##### user

[`AuthenticationUser`](AuthenticationUser.md)

The account.

##### hashOptions?

`IPasswordHashOptions`

The Argon2id parameters for new hashes.

#### Returns

`boolean`

True when the hash should be replaced.

***

### createUser() {#createuser}

> `static` **createUser**(`userEntityStorage`, `authProviderId`, `accountId`, `email`, `password`, `options?`, `settings?`): `Promise`\<[`AuthenticationUser`](AuthenticationUser.md)\>

Create an account that signs in with a password.

#### Parameters

##### userEntityStorage

`IEntityStorageConnector`\<[`AuthenticationUser`](AuthenticationUser.md)\>

The entity storage for users.

##### authProviderId

`string`

The authentication provider id of password accounts.

##### accountId

`string`

The account id to use.

##### email

`string`

The e-mail address of the account, stored normalised.

##### password

`string`

The password of the account.

##### options?

`IPasswordOptions`

Optional password length validation options.

##### settings?

Optional settings for the new account.

###### passwordHashOptions?

`IPasswordHashOptions`

The Argon2id parameters.

###### verified?

`boolean`

False when the e-mail address must still be verified.

###### disabled?

`boolean`

True to create the account disabled.

#### Returns

`Promise`\<[`AuthenticationUser`](AuthenticationUser.md)\>

The new account.

***

### createUserWithHash() {#createuserwithhash}

> `static` **createUserWithHash**(`userEntityStorage`, `authProviderId`, `accountId`, `email`, `passwordHash`, `settings?`): `Promise`\<[`AuthenticationUser`](AuthenticationUser.md)\>

Create an account that signs in with a password already validated and hashed.

#### Parameters

##### userEntityStorage

`IEntityStorageConnector`\<[`AuthenticationUser`](AuthenticationUser.md)\>

The entity storage for users.

##### authProviderId

`string`

The authentication provider id of password accounts.

##### accountId

`string`

The account id to use.

##### email

`string`

The e-mail address of the account, stored normalised.

##### passwordHash

`Required`\<`Pick`\<[`AuthenticationUser`](AuthenticationUser.md), `"password"` \| `"salt"` \| `"passwordAlgorithm"` \| `"passwordHashParameters"`\>\>

The password hash, from hashPassword.

##### settings?

Optional settings for the new account.

###### verified?

`boolean`

False when the e-mail address must still be verified.

###### disabled?

`boolean`

True to create the account disabled.

#### Returns

`Promise`\<[`AuthenticationUser`](AuthenticationUser.md)\>

The new account.

***

### updatePassword() {#updatepassword}

> `static` **updatePassword**(`userEntityStorage`, `authenticationAuditService`, `user`, `newPassword`, `currentPassword?`, `options?`, `settings?`): `Promise`\<[`AuthenticationUser`](AuthenticationUser.md)\>

Update the password for a user, ending its sessions and removing its password reset tokens.
The current password must be given and match unless requireCurrentPassword is false, as for an
admin or a password reset, it is still checked when given.

#### Parameters

##### userEntityStorage

`IEntityStorageConnector`\<[`AuthenticationUser`](AuthenticationUser.md)\>

The entity storage for users.

##### authenticationAuditService

`IAuthenticationAuditComponent`

The optional audit service.

##### user

[`AuthenticationUser`](AuthenticationUser.md)

The user whose password is being updated.

##### newPassword

`string`

The new password to set.

##### currentPassword?

`string`

The current password to verify against.

##### options?

`IPasswordOptions`

Optional password length validation options.

##### settings?

Optional settings for the update.

###### requireCurrentPassword?

`boolean`

False when the current password is not required.

###### passwordHashOptions?

`IPasswordHashOptions`

The Argon2id parameters.

###### passwordResetEntityStorage?

`IEntityStorageConnector`\<[`AuthenticationPasswordReset`](AuthenticationPasswordReset.md)\>

The storage of the password reset tokens to remove.

###### actorAccountId?

`string`

The account making the change, when it is not the user.

###### markVerified?

`boolean`

True to also mark the e-mail address of the account verified.

#### Returns

`Promise`\<[`AuthenticationUser`](AuthenticationUser.md)\>

The updated account.

#### Throws

ForbiddenError when the current password is given and does not match.

#### Throws

ConflictError when the account kept changing or was removed during the update.
