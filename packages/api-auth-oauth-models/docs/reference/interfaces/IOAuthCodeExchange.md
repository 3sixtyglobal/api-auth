# Interface: IOAuthCodeExchange

The credentials an OAuth provider connector exchanges for an identity.

## Properties

### code {#code}

> **code**: `string`

The authorization code from the callback.

***

### codeVerifier {#codeverifier}

> **codeVerifier**: `string`

The PKCE code verifier the code challenge was made from.

***

### redirectUri {#redirecturi}

> **redirectUri**: `string`

The address the provider sent the browser back to.

***

### nonce {#nonce}

> **nonce**: `string`

The nonce sent with the authorization request.
