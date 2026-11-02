# Function: authenticationRegister()

> **authenticationRegister**(`httpRequestContext`, `componentName`, `request`): `Promise`\<`IRegisterAcceptedResponse`\>

Sign up for a password account, accepted whether or not the address is taken.

## Parameters

### httpRequestContext

`IHttpRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

### request

`IRegisterRequest`

The request.

## Returns

`Promise`\<`IRegisterAcceptedResponse`\>

The response object with additional http response properties.
