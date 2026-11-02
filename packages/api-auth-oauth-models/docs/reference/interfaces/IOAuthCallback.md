# Interface: IOAuthCallback

The query parameters a provider sends the browser back with.

## Properties

### code? {#code}

> `optional` **code?**: `string`

The authorization code, when the sign in succeeded.

***

### state? {#state}

> `optional` **state?**: `string`

The state sent with the authorization request.

***

### error? {#error}

> `optional` **error?**: `string`

The error code, when the sign in did not succeed.
