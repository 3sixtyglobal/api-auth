# Function: authenticationPasswordForgot()

> **authenticationPasswordForgot**(`httpRequestContext`, `componentName`, `request`): `Promise`\<`INoContentResponse`\>

Send a link to reset a forgotten password.

## Parameters

### httpRequestContext

`IHttpRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

### request

`IPasswordForgotRequest`

The request.

## Returns

`Promise`\<`INoContentResponse`\>

The response object with additional http response properties.
