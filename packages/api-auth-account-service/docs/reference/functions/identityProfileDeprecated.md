# Function: identityProfileDeprecated()

> **identityProfileDeprecated**(`httpRequestContext`, `componentName`): `Promise`\<`INoContentResponse`\>

Refuse a request to the deprecated identity profile routes.

## Parameters

### httpRequestContext

`IHttpRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

## Returns

`Promise`\<`INoContentResponse`\>

Never returns.

## Throws

NotImplementedError with the deprecation notice, pointing at the authentication account
endpoints, as its cause.
