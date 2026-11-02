# Function: authenticationAccountCancelOrganizationRequest()

> **authenticationAccountCancelOrganizationRequest**(`httpRequestContext`, `componentName`, `request`): `Promise`\<`INoContentResponse`\>

Cancel the pending request of the signed in account to join an organization.

## Parameters

### httpRequestContext

`IHttpRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

### request

`IAccountOrganizationRequestCancelRequest`

The request.

## Returns

`Promise`\<`INoContentResponse`\>

The response object with additional http response properties.
