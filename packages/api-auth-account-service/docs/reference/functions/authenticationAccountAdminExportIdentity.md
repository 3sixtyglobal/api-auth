# Function: authenticationAccountAdminExportIdentity()

> **authenticationAccountAdminExportIdentity**(`httpRequestContext`, `componentName`, `request`): `Promise`\<`IAccountIdentityExportResponse`\>

Export the identity of an account, the session of the caller must have started recently.

## Parameters

### httpRequestContext

`IHttpRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

### request

`IAccountAdminIdentityExportRequest`

The request.

## Returns

`Promise`\<`IAccountIdentityExportResponse`\>

The response object with additional http response properties.
