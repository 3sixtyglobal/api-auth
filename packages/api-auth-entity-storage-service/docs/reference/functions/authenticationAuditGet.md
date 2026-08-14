# Function: authenticationAuditGet()

> **authenticationAuditGet**(`httpRequestContext`, `componentName`, `request`): `Promise`\<`IAuditGetResponse`\>

Get an authentication audit entry.

## Parameters

### httpRequestContext

`IHttpRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

### request

`IAuditGetRequest`

The request.

## Returns

`Promise`\<`IAuditGetResponse`\>

The response object with additional http response properties.
