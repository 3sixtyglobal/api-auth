# Function: authenticationAuthorize()

> **authenticationAuthorize**(`httpRequestContext`, `componentName`, `request`): `Promise`\<`IAuthorizeResponse`\>

Check the e-mail address and password of a password account and issue an OAuth 2.0 authorization code.

## Parameters

### httpRequestContext

`IHttpRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

### request

`IAuthorizeRequest`

The request.

## Returns

`Promise`\<`IAuthorizeResponse`\>

The response object with additional http response properties.
