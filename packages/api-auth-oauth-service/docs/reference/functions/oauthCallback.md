# Function: oauthCallback()

> **oauthCallback**(`httpRequestContext`, `componentName`, `request`, `baseRouteName`): `Promise`\<`IOAuthRedirectResponse`\>

Complete a sign in when the authentication provider sends the browser back.

## Parameters

### httpRequestContext

`IHttpRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

### request

`IOAuthCallbackRequest`

The request.

### baseRouteName

`string`

The base route name, used to build the callback address.

## Returns

`Promise`\<`IOAuthRedirectResponse`\>

A redirect to the success or failure address.
