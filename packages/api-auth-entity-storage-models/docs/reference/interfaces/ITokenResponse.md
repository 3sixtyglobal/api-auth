# Interface: ITokenResponse

The access token issued for an OAuth 2.0 authorization code.

## See

https://datatracker.ietf.org/doc/html/rfc6749#section-5.1

## Properties

### headers {#headers}

> **headers**: `IHttpHeaders`

The response headers, which stop the token being cached.

***

### body {#body}

> **body**: [`IOAuthAccessToken`](IOAuthAccessToken.md)

The response details.
