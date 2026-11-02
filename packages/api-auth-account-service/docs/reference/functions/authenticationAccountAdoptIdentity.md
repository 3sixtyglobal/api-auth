# Function: authenticationAccountAdoptIdentity()

> **authenticationAccountAdoptIdentity**(`httpRequestContext`, `componentName`, `request`): `Promise`\<`IAccountIdentityAdoptResponse`\>

Adopt an identity for the signed in account, the session must have started recently.

## Parameters

### httpRequestContext

`IHttpRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

### request

`IAccountIdentityAdoptRequest`

The request.

## Returns

`Promise`\<`IAccountIdentityAdoptResponse`\>

The response object with additional http response properties.
