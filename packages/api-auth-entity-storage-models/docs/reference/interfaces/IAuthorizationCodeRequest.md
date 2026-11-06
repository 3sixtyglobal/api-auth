# Interface: IAuthorizationCodeRequest

The OAuth 2.0 authorization request an authorization code is issued for.

## Properties

### state {#state}

> **state**: `string`

The state from the authorization request, returned unchanged with the code.

***

### nonce {#nonce}

> **nonce**: `string`

The nonce from the authorization request, which the code is bound to.

***

### codeChallenge {#codechallenge}

> **codeChallenge**: `string`

The PKCE code challenge, the base64url SHA-256 of the code verifier.

***

### codeChallengeMethod {#codechallengemethod}

> **codeChallengeMethod**: `string`

The PKCE code challenge method, only S256 is accepted.

***

### redirectUri {#redirecturi}

> **redirectUri**: `string`

The address the browser is sent back to with the code, which must be on the node's public origin.
