# Function: authenticationAdminGetUserByIdentity()

> **authenticationAdminGetUserByIdentity**(`httpRequestContext`, `componentName`, `request`): `Promise`\<`IAdminUserGetResponse`\>

Get an existing user by identity.

## Parameters

### httpRequestContext

`IHttpRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

### request

`IAdminUserGetByIdentityRequest`

The request.

## Returns

`Promise`\<`IAdminUserGetResponse`\>

The response object with additional http response properties.
