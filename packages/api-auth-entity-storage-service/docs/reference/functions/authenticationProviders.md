# Function: authenticationProviders()

> **authenticationProviders**(`httpRequestContext`, `componentName`, `request`): `Promise`\<`IProvidersResponse`\>

Get the enabled authentication providers.

## Parameters

### httpRequestContext

`IHttpRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

### request

`IProvidersRequest`

The request.

## Returns

`Promise`\<`IProvidersResponse`\>

The response object with additional http response properties.
