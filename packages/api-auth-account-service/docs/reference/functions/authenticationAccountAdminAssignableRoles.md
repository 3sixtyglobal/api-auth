# Function: authenticationAccountAdminAssignableRoles()

> **authenticationAccountAdminAssignableRoles**(`httpRequestContext`, `componentName`): `Promise`\<`IAccountAdminRolesResponse`\>

Get the roles the caller may grant and revoke.

## Parameters

### httpRequestContext

`IHttpRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

## Returns

`Promise`\<`IAccountAdminRolesResponse`\>

The response object with additional http response properties.
