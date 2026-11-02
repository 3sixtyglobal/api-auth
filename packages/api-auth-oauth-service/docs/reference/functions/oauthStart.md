# Function: oauthStart()

> **oauthStart**(`httpRequestContext`, `componentName`, `request`, `baseRouteName`): `Promise`\<`IOAuthRedirectResponse`\>

Start a sign in with an authentication provider.

## Parameters

### httpRequestContext

`IHttpRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

### request

`IOAuthStartRequest`

The request.

### baseRouteName

`string`

The base route name, used to build the callback address.

## Returns

`Promise`\<`IOAuthRedirectResponse`\>

A redirect to the provider, keeping the sign in in a cookie.
