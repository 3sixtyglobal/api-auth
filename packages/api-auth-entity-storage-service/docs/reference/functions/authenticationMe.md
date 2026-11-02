# Function: authenticationMe()

> **authenticationMe**(`httpRequestContext`, `componentName`, `request`): `Promise`\<`IMeResponse`\>

Get the signed in account.

## Parameters

### httpRequestContext

`IHttpRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

### request

`INoContentRequest`

The request.

## Returns

`Promise`\<`IMeResponse`\>

The response object with additional http response properties.
