# Function: generateRestRoutesIdentityProfileDeprecated()

> **generateRestRoutesIdentityProfileDeprecated**(`baseRouteName`, `componentName`): `IRestRoute`\<`any`, `any`\>[]

The REST routes that replace the identity profile routes, each refuses the request with a
deprecation notice pointing at the authentication account endpoints.

## Parameters

### baseRouteName

`string`

Prefix to prepend to the paths.

### componentName

`string`

The name of the component to use in the routes stored in the ComponentFactory.

## Returns

`IRestRoute`\<`any`, `any`\>[]

The generated routes.
