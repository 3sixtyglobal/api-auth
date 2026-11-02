# Function: authenticationAccountJoinOrganization()

> **authenticationAccountJoinOrganization**(`httpRequestContext`, `componentName`, `request`): `Promise`\<`INoContentResponse`\>

Ask to join an organization with the signed in account.

## Parameters

### httpRequestContext

`IHttpRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

### request

`IAccountOrganizationJoinRequest`

The request.

## Returns

`Promise`\<`INoContentResponse`\>

The response object with additional http response properties.
