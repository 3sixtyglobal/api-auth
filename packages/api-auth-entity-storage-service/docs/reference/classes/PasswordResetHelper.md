# Class: PasswordResetHelper

Helper class for the single use tokens that reset a forgotten password or verify a sign up.

## Constructors

### Constructor

> **new PasswordResetHelper**(): `PasswordResetHelper`

#### Returns

`PasswordResetHelper`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

***

### PURPOSE\_PASSWORD\_RESET {#purpose_password_reset}

> `readonly` `static` **PURPOSE\_PASSWORD\_RESET**: `string` = `"password-reset"`

The purpose of a password reset token, stored as absent.

***

### PURPOSE\_REGISTRATION {#purpose_registration}

> `readonly` `static` **PURPOSE\_REGISTRATION**: `string` = `"registration"`

The purpose of a sign up verification token.

## Methods

### create() {#create}

> `static` **create**(`storage`, `accountId`, `expiryMinutes`, `purpose?`, `passwordHash?`): `Promise`\<\{ `token`: `string`; `expires`: `string`; \}\>

Create a token for an account, replacing any token the account already has for the purpose.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`AuthenticationPasswordReset`](AuthenticationPasswordReset.md)\>

The entity storage for the tokens.

##### accountId

`string`

The account id.

##### expiryMinutes

`number`

How long the token can be used for, in minutes.

##### purpose?

`string`

What the token is for, a password reset when omitted.

##### passwordHash?

`Pick`\<[`AuthenticationPasswordReset`](AuthenticationPasswordReset.md), `"password"` \| `"salt"` \| `"passwordAlgorithm"` \| `"passwordHashParameters"`\>

The password hash to store with the token, for a sign up.

#### Returns

`Promise`\<\{ `token`: `string`; `expires`: `string`; \}\>

The token and when it expires, in ISO date format.

***

### consume() {#consume}

> `static` **consume**(`storage`, `token`, `purpose?`): `Promise`\<[`AuthenticationPasswordReset`](AuthenticationPasswordReset.md) \| `undefined`\>

Use a token, removing it so it cannot be used again.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`AuthenticationPasswordReset`](AuthenticationPasswordReset.md)\>

The entity storage for the tokens.

##### token

`string`

The token.

##### purpose?

`string`

What the token must be for, a password reset when omitted.

#### Returns

`Promise`\<[`AuthenticationPasswordReset`](AuthenticationPasswordReset.md) \| `undefined`\>

The stored token, or undefined when it is unknown, used, for another purpose or has expired.

***

### removeExpired() {#removeexpired}

> `static` **removeExpired**(`storage`): `Promise`\<`number`\>

Remove the tokens that have expired.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`AuthenticationPasswordReset`](AuthenticationPasswordReset.md)\>

The entity storage for the tokens.

#### Returns

`Promise`\<`number`\>

The number of tokens removed.

***

### removeForAccount() {#removeforaccount}

> `static` **removeForAccount**(`storage`, `accountId`, `purpose?`): `Promise`\<`void`\>

Remove the tokens of an account.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`AuthenticationPasswordReset`](AuthenticationPasswordReset.md)\>

The entity storage for the tokens.

##### accountId

`string`

The account id.

##### purpose?

`string`

Only remove the tokens for this purpose, a password reset when omitted, or every
token when all.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the tokens have been removed.

***

### hashToken() {#hashtoken}

> `static` **hashToken**(`token`): `string`

Hash a token, so the token itself is not stored.

#### Parameters

##### token

`string`

The token.

#### Returns

`string`

The hash, hex encoded.
