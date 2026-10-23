# Function: authenticationPasswordPolicy()

> **authenticationPasswordPolicy**(`httpRequestContext`, `componentName`, `request`): `Promise`\<`IPasswordPolicyResponse` & `IRestRouteResponseOptions`\>

Get the password policy.

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

`Promise`\<`IPasswordPolicyResponse` & `IRestRouteResponseOptions`\>

The response object with additional http response properties.
