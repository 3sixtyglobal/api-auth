# Function: authenticationAccountCreate()

> **authenticationAccountCreate**(`httpRequestContext`, `componentName`, `request`, `baseRouteName`): `Promise`\<`ICreatedResponse`\>

Store an item of account data.

## Parameters

### httpRequestContext

`IHttpRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

### request

`IAccountDataCreateRequest`

The request.

### baseRouteName

`string`

The base route name to use for the location header.

## Returns

`Promise`\<`ICreatedResponse`\>

The response object with additional http response properties.
