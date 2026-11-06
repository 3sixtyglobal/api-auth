# Interface: ITokenErrorResponse

A token request that was refused, with the error codes RFC 6749 gives them.

## See

https://datatracker.ietf.org/doc/html/rfc6749#section-5.2

## Properties

### statusCode {#statuscode}

> **statusCode**: `400`

Response status code.

***

### headers {#headers}

> **headers**: `IHttpHeaders`

The response headers, which stop the response being cached.

***

### body {#body}

> **body**: `object`

The response details.

#### error

> **error**: `string`

The error code, such as invalid_grant, invalid_request or unsupported_grant_type.
