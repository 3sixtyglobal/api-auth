# Function: authenticationAccountAdminCreateIdentity()

> **authenticationAccountAdminCreateIdentity**(`httpRequestContext`, `componentName`, `request`): `Promise`\<`IAccountIdentityAdoptResponse`\>

Create an identity with keys the node holds for an account that has none.

## Parameters

### httpRequestContext

`IHttpRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

### request

`IAccountAdminIdentityCreateRequest`

The request.

## Returns

`Promise`\<`IAccountIdentityAdoptResponse`\>

The response object with additional http response properties.
