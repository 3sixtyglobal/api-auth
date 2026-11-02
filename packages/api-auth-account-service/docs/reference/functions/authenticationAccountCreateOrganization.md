# Function: authenticationAccountCreateOrganization()

> **authenticationAccountCreateOrganization**(`httpRequestContext`, `componentName`, `request`, `baseRouteName`): `Promise`\<`IAccountOrganizationCreateResponse`\>

Create an organization for the signed in account.

## Parameters

### httpRequestContext

`IHttpRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

### request

`IAccountOrganizationCreateRequest`

The request.

### baseRouteName

`string`

The base route name to use for the location header.

## Returns

`Promise`\<`IAccountOrganizationCreateResponse`\>

The response object with additional http response properties.
