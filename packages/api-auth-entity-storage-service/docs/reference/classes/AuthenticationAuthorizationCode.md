# Class: AuthenticationAuthorizationCode

Class defining the storage for a single use OAuth 2.0 authorization code for a password account.

## Constructors

### Constructor

> **new AuthenticationAuthorizationCode**(): `AuthenticationAuthorizationCode`

#### Returns

`AuthenticationAuthorizationCode`

## Properties

### id {#id}

> **id**: `string`

The hash of the code, the code itself is never stored.

***

### accountId {#accountid}

> **accountId**: `string`

The account the code signs in.

***

### redirectUri {#redirecturi}

> **redirectUri**: `string`

The address the code was sent to, which the exchange must give again.

***

### codeChallenge {#codechallenge}

> **codeChallenge**: `string`

The PKCE code challenge, the base64url SHA-256 of the code verifier.

***

### nonce {#nonce}

> **nonce**: `string`

The nonce from the authorization request.

***

### expires {#expires}

> **expires**: `string`

When the code expires, in ISO date format.

***

### dateCreated {#datecreated}

> **dateCreated**: `string`

When the code was created, in ISO date format.
