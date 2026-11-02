# Interface: IOAuthTransaction

A sign in kept by the browser between starting and the callback.

## Properties

### authProviderId {#authproviderid}

> **authProviderId**: `string`

The authentication provider id the sign in started with.

***

### state {#state}

> **state**: `string`

The state sent with the authorization request.

***

### nonce {#nonce}

> **nonce**: `string`

The nonce sent with the authorization request.

***

### codeVerifier {#codeverifier}

> **codeVerifier**: `string`

The PKCE code verifier.

***

### expires {#expires}

> **expires**: `number`

When the sign in expires, in milliseconds since the epoch.
