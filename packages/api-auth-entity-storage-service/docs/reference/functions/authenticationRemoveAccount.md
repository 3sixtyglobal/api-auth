# Function: authenticationRemoveAccount()

> **authenticationRemoveAccount**(`httpRequestContext`, `componentName`, `request`): `Promise`\<`INoContentResponse` & `IRestRouteResponseOptions`\>

Remove the signed in account and sign out.

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

`Promise`\<`INoContentResponse` & `IRestRouteResponseOptions`\>

The response object with additional http response properties.
