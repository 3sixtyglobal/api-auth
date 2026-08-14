# Class: AuthHeaderProcessor

Handle a JWT token in the authorization header or cookies and validate it to populate request context identity.

## Implements

- `IBaseRouteProcessor`

## Constructors

### Constructor

> **new AuthHeaderProcessor**(`options?`): `AuthHeaderProcessor`

Create a new instance of AuthHeaderProcessor.

#### Parameters

##### options?

[`IAuthHeaderProcessorConstructorOptions`](../interfaces/IAuthHeaderProcessorConstructorOptions.md)

Options for the processor.

#### Returns

`AuthHeaderProcessor`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

## Methods

### className() {#classname}

> **className**(): `string`

Returns the class name of the component.

#### Returns

`string`

The class name of the component.

#### Implementation of

`IBaseRouteProcessor.className`

***

### start() {#start}

> **start**(`nodeLoggingComponentType?`): `Promise`\<`void`\>

The service needs to be started when the application is initialized.

#### Parameters

##### nodeLoggingComponentType?

`string`

The node logging component type.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the node identity and organization ID have been cached.

#### Implementation of

`IBaseRouteProcessor.start`

***

### pre() {#pre}

> **pre**(`request`, `response`, `route`, `contextIds`, `processorState`): `Promise`\<`void`\>

Pre process the REST request for the specified route.

#### Parameters

##### request

`IHttpServerRequest`

The incoming request.

##### response

`IHttpResponse`

The outgoing response.

##### route

`IBaseRoute` \| `undefined`

The route to process.

##### contextIds

`IContextIds`

The context IDs of the request.

##### processorState

The state handed through the processors.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the JWT has been verified and the context populated, or an error response set.

#### Implementation of

`IBaseRouteProcessor.pre`

***

### post() {#post}

> **post**(`request`, `response`, `route`, `contextIds`, `processorState`): `Promise`\<`void`\>

Post process the REST request for the specified route.

#### Parameters

##### request

`IHttpServerRequest`

The incoming request.

##### response

`IHttpResponse`

The outgoing response.

##### route

`IBaseRoute` \| `undefined`

The route to process.

##### contextIds

`IContextIds`

The context IDs of the request.

##### processorState

The state handed through the processors.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the Set-Cookie header has been applied to the response if required.

#### Implementation of

`IBaseRouteProcessor.post`
