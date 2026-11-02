# Function: authenticationPasswordReset()

> **authenticationPasswordReset**(`httpRequestContext`, `componentName`, `request`): `Promise`\<`INoContentResponse`\>

Reset a forgotten password with the token from the reset link.

## Parameters

### httpRequestContext

`IHttpRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

### request

`IPasswordResetRequest`

The request.

## Returns

`Promise`\<`INoContentResponse`\>

The response object with additional http response properties.
