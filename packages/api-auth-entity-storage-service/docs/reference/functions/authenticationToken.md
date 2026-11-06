# Function: authenticationToken()

> **authenticationToken**(`httpRequestContext`, `componentName`, `request`): `Promise`\<`ITokenResponse` \| `ITokenErrorResponse`\>

Exchange an OAuth 2.0 authorization code for an access token, answering with the errors RFC 6749
gives when the request is refused.

## Parameters

### httpRequestContext

`IHttpRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

### request

`ITokenRequest`

The request.

## Returns

`Promise`\<`ITokenResponse` \| `ITokenErrorResponse`\>

The response object with additional http response properties.
