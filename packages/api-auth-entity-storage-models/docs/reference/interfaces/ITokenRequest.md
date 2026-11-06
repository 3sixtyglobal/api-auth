# Interface: ITokenRequest

Exchange an OAuth 2.0 authorization code for an access token, with the field names RFC 6749 gives
them, sent as a form or as JSON.

## See

https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.3

## Properties

### body {#body}

> **body**: `object`

The body of the request.

#### grant\_type

> **grant\_type**: `string`

The grant type, only authorization_code.

#### code

> **code**: `string`

The authorization code.

#### redirect\_uri

> **redirect\_uri**: `string`

The redirect address the code was sent to.

#### code\_verifier

> **code\_verifier**: `string`

The PKCE code verifier the code challenge was made from.

#### client\_id?

> `optional` **client\_id?**: `string`

The id of the client, not checked as clients are public.
