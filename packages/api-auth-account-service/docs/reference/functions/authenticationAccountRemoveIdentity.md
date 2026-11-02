# Function: authenticationAccountRemoveIdentity()

> **authenticationAccountRemoveIdentity**(`httpRequestContext`, `componentName`): `Promise`\<`INoContentResponse`\>

Remove the identity of the signed in account, the session must have started recently.

## Parameters

### httpRequestContext

`IHttpRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

## Returns

`Promise`\<`INoContentResponse`\>

The response object with additional http response properties.
