# Function: authenticationAccountAdminImportProfile()

> **authenticationAccountAdminImportProfile**(`httpRequestContext`, `componentName`, `request`): `Promise`\<`IAccountProfileImportResponse`\>

Replace the account data of an account with an export.

## Parameters

### httpRequestContext

`IHttpRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

### request

`IAccountAdminProfileImportRequest`

The request.

## Returns

`Promise`\<`IAccountProfileImportResponse`\>

The response object with additional http response properties.
