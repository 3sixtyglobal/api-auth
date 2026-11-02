# Interface: IOAuthCallbackRequest

The browser returning from a provider.

## Properties

### pathParams {#pathparams}

> **pathParams**: `object`

The path parameters for the request.

#### authProviderId

> **authProviderId**: `string`

The authentication provider id.

***

### query? {#query}

> `optional` **query?**: `object`

The query parameters from the provider.

#### code?

> `optional` **code?**: `string`

The authorization code, when the sign in succeeded.

#### state?

> `optional` **state?**: `string`

The state sent with the authorization request.

#### error?

> `optional` **error?**: `string`

The error code, when the sign in did not succeed.
