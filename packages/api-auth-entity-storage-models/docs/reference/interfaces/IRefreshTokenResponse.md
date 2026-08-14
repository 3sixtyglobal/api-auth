# Interface: IRefreshTokenResponse

Response from a refresh on the auth token.

## Properties

### headers? {#headers}

> `optional` **headers?**: `object`

Response headers.

#### set-cookie?

> `optional` **set-cookie?**: `string`

The cookie containing the auth token.

***

### body {#body}

> **body**: `object`

The refresh token details.

#### expiry

> **expiry**: `number`

The expiry time of the token.
