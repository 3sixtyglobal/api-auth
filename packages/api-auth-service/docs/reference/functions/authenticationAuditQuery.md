# Function: authenticationAuditQuery()

> **authenticationAuditQuery**(`httpRequestContext`, `componentName`, `request`): `Promise`\<`IAuditQueryResponse`\>

Query authentication audit entries.

## Parameters

### httpRequestContext

`IHttpRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

### request

`IAuditQueryRequest`

The request.

## Returns

`Promise`\<`IAuditQueryResponse`\>

The response object with additional http response properties.
