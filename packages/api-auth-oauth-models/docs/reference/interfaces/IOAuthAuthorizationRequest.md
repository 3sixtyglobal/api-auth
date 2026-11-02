# Interface: IOAuthAuthorizationRequest

The values needed to send a browser to a provider to sign in.

## Properties

### state {#state}

> **state**: `string`

The value the provider returns unchanged, to match the callback to this request.

***

### nonce {#nonce}

> **nonce**: `string`

The value the provider puts in the ID token, to bind the token to this request.

***

### codeChallenge {#codechallenge}

> **codeChallenge**: `string`

The PKCE code challenge, the base64url SHA-256 of the code verifier.

***

### redirectUri {#redirecturi}

> **redirectUri**: `string`

The address the provider sends the browser back to.
