# Function: organizationExportIdentity()

> **organizationExportIdentity**(`httpRequestContext`, `componentName`, `request`): `Promise`\<`IOrganizationIdentityExportResponse`\>

Export the identity of an organization, the session must have started recently.

## Parameters

### httpRequestContext

`IHttpRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

### request

`IOrganizationIdentityExportRequest`

The request.

## Returns

`Promise`\<`IOrganizationIdentityExportResponse`\>

The response object with additional http response properties.
