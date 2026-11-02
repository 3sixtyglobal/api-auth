# Function: authenticationAccountAdminImportIdentity()

> **authenticationAccountAdminImportIdentity**(`httpRequestContext`, `componentName`, `request`): `Promise`\<`IAccountIdentityImportResponse`\>

Import an identity into an account that has none.

## Parameters

### httpRequestContext

`IHttpRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

### request

`IAccountAdminIdentityImportRequest`

The request.

## Returns

`Promise`\<`IAccountIdentityImportResponse`\>

The response object with additional http response properties.
