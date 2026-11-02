# Function: organizationRequestAdminCount()

> **organizationRequestAdminCount**(`httpRequestContext`, `componentName`, `request`): `Promise`\<`IOrganizationRequestCountResponse`\>

Count the requests to join an organization of a status, up to a cap.

## Parameters

### httpRequestContext

`IHttpRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

### request

`IOrganizationRequestCountRequest`

The request.

## Returns

`Promise`\<`IOrganizationRequestCountResponse`\>

The response object with additional http response properties.
