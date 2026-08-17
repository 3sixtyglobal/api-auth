# Function: authenticationAuditRemove()

> **authenticationAuditRemove**(`httpRequestContext`, `componentName`, `request`): `Promise`\<`INoContentResponse`\>

Remove an authentication audit entry.

## Parameters

### httpRequestContext

`IHttpRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

### request

`IAuditRemoveRequest`

The request.

## Returns

`Promise`\<`INoContentResponse`\>

The response object with additional http response properties.
