# Function: authenticationAuditCreate()

> **authenticationAuditCreate**(`httpRequestContext`, `componentName`, `request`, `baseRouteName`): `Promise`\<`ICreatedResponse`\>

Create an authentication audit entry.

## Parameters

### httpRequestContext

`IHttpRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

### request

`IAuditCreateRequest`

The request.

### baseRouteName

`string`

The base route name to use for the location header.

## Returns

`Promise`\<`ICreatedResponse`\>

The response object with additional http response properties.
