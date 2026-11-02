# Interface: IOidcIdTokenOptions

The checks an OpenID Connect ID token must pass.

## Properties

### jwksUri {#jwksuri}

> **jwksUri**: `string`

The address of the provider's signing keys.

***

### audience {#audience}

> **audience**: `string`

The client id the token must be issued to.

***

### nonce {#nonce}

> **nonce**: `string`

The nonce sent with the authorization request.

***

### isIssuer {#isissuer}

> **isIssuer**: (`issuer`, `payload`) => `boolean`

Check whether the issuer is the provider.

#### Parameters

##### issuer

`string`

The issuer claim of the token.

##### payload

`JWTPayload`

The payload of the token.

#### Returns

`boolean`

True when the issuer is the provider.
