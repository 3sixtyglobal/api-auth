# Function: organizationRequestAdminReject()

> **organizationRequestAdminReject**(`httpRequestContext`, `componentName`, `request`): `Promise`\<`INoContentResponse`\>

Reject a request to join an organization.

## Parameters

### httpRequestContext

`IHttpRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

### request

`IOrganizationRequestRejectRequest`

The request.

## Returns

`Promise`\<`INoContentResponse`\>

The response object with additional http response properties.
