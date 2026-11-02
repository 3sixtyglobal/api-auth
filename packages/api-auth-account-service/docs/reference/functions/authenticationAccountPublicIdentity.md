# Function: authenticationAccountPublicIdentity()

> **authenticationAccountPublicIdentity**(`httpRequestContext`, `componentName`, `request`): `Promise`\<`IAccountPublicDataGetResponse`\>

Get the public data of the organization or account that holds a DID.

## Parameters

### httpRequestContext

`IHttpRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

### request

`IAccountPublicIdentityGetRequest`

The request.

## Returns

`Promise`\<`IAccountPublicDataGetResponse`\>

The response object with additional http response properties.
