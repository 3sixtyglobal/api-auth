# Function: authenticationRegisterVerify()

> **authenticationRegisterVerify**(`httpRequestContext`, `componentName`, `request`): `Promise`\<`INoContentResponse`\>

Verify the e-mail address of a sign up.

## Parameters

### httpRequestContext

`IHttpRequestContext`

The request context for the API.

### componentName

`string`

The name of the component to use in the routes.

### request

`IRegisterVerifyRequest`

The request.

## Returns

`Promise`\<`INoContentResponse`\>

The response object with additional http response properties.
