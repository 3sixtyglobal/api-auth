# Function: featureList()

> **featureList**(`httpRequestContext`, `componentName`, `request`): `Promise`\<`IFeatureListResponse`\>

List the features the signed in account can use.

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

`Promise`\<`IFeatureListResponse`\>

The response object with additional http response properties.
