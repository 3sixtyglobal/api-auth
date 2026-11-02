# Function: authenticationAccountImportProfile()

> **authenticationAccountImportProfile**(`httpRequestContext`, `componentName`, `request`): `Promise`\<`IAccountProfileImportResponse`\>

Replace the account data of the signed in account with an export.

## Parameters

### httpRequestContext

`IHttpRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

### request

`IAccountProfileImportRequest`

The request.

## Returns

`Promise`\<`IAccountProfileImportResponse`\>

The response object with additional http response properties.
