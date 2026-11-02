# Function: authenticationAccountImportIdentity()

> **authenticationAccountImportIdentity**(`httpRequestContext`, `componentName`, `request`): `Promise`\<`IAccountIdentityImportResponse`\>

Import an identity into the signed in account, the session must have started recently.

## Parameters

### httpRequestContext

`IHttpRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

### request

`IAccountIdentityImportRequest`

The request.

## Returns

`Promise`\<`IAccountIdentityImportResponse`\>

The response object with additional http response properties.
