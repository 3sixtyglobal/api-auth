# Interface: IUpdatePasswordResponse

Response from updating the current user's password, with the new token for the current session.

## Properties

### headers? {#headers}

> `optional` **headers?**: `object`

Response headers.

#### set-cookie?

> `optional` **set-cookie?**: `string`

The cookie containing the auth token, when the request was authenticated by cookie.

***

### body {#body}

> **body**: `object`

The new token details.

#### token?

> `optional` **token?**: `string`

The new token, when the request was not authenticated by cookie.

#### expiry

> **expiry**: `number`

The expiry time of the token.
