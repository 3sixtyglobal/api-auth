# Interface: ILoginResponse

Response from a login on the server.

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

The login response details.

#### expiry

> **expiry**: `number`

The expiry time of the token.
