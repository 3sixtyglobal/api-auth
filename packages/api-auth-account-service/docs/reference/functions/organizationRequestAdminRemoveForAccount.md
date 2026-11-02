# Function: organizationRequestAdminRemoveForAccount()

> **organizationRequestAdminRemoveForAccount**(`httpRequestContext`, `componentName`, `request`): `Promise`\<`INoContentResponse`\>

Remove every request of an account to join an organization.

## Parameters

### httpRequestContext

`IHttpRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

### request

`IOrganizationRequestRemoveForAccountRequest`

The request.

## Returns

`Promise`\<`INoContentResponse`\>

The response object with additional http response properties.
