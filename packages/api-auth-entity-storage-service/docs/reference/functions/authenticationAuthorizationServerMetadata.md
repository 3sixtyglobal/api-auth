# Function: authenticationAuthorizationServerMetadata()

> **authenticationAuthorizationServerMetadata**(`httpRequestContext`, `componentName`, `request`): `Promise`\<`IAuthorizationServerMetadataResponse`\>

Get the OAuth 2.0 authorization server metadata of the node.

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

`Promise`\<`IAuthorizationServerMetadataResponse`\>

The response object with additional http response properties.
