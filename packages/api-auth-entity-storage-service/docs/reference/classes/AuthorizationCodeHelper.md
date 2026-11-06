# Class: AuthorizationCodeHelper

Helper class for the single use OAuth 2.0 authorization codes of password accounts.

## Constructors

### Constructor

> **new AuthorizationCodeHelper**(): `AuthorizationCodeHelper`

#### Returns

`AuthorizationCodeHelper`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

## Methods

### create() {#create}

> `static` **create**(`storage`, `accountId`, `authorization`, `expirySeconds`): `Promise`\<`string`\>

Create a code for an account.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`AuthenticationAuthorizationCode`](AuthenticationAuthorizationCode.md)\>

The entity storage for the codes.

##### accountId

`string`

The account id.

##### authorization

`IAuthorizationCodeRequest`

The authorization request the code is issued for.

##### expirySeconds

`number`

How long the code can be used for, in seconds.

#### Returns

`Promise`\<`string`\>

The code.

***

### redeem() {#redeem}

> `static` **redeem**(`storage`, `code`, `codeVerifier`, `redirectUri`, `nonce?`): `Promise`\<[`AuthenticationAuthorizationCode`](AuthenticationAuthorizationCode.md) \| `undefined`\>

Redeem a code, removing it so it cannot be used again, even when it does not match.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`AuthenticationAuthorizationCode`](AuthenticationAuthorizationCode.md)\>

The entity storage for the codes.

##### code

`string`

The code.

##### codeVerifier

`string`

The PKCE code verifier the code challenge was made from.

##### redirectUri

`string`

The redirect address the code was sent to.

##### nonce?

`string`

The nonce of the authorization request, checked when given.

#### Returns

`Promise`\<[`AuthenticationAuthorizationCode`](AuthenticationAuthorizationCode.md) \| `undefined`\>

The stored code, or undefined when it is unknown, used, expired or does not match.

***

### removeExpired() {#removeexpired}

> `static` **removeExpired**(`storage`): `Promise`\<`number`\>

Remove the codes that have expired.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`AuthenticationAuthorizationCode`](AuthenticationAuthorizationCode.md)\>

The entity storage for the codes.

#### Returns

`Promise`\<`number`\>

The number of codes removed.
