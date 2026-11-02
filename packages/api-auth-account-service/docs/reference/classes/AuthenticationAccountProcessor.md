# Class: AuthenticationAccountProcessor

Sets the identity and organization of the signed in account on the request context, so routes
can be authorized against the identity. Run it after the auth header processor. Changes to the
identity or organization of an account clear its cached entry in this process, other processes
keep theirs until the time to live expires. An account without an identity is kept for a shorter
time, noIdentityCacheTtlMs.

## Implements

- `IBaseRouteProcessor`

## Constructors

### Constructor

> **new AuthenticationAccountProcessor**(`options?`): `AuthenticationAccountProcessor`

Create a new instance of AuthenticationAccountProcessor.

#### Parameters

##### options?

[`IAuthenticationAccountProcessorConstructorOptions`](../interfaces/IAuthenticationAccountProcessorConstructorOptions.md)

The options for the processor.

#### Returns

`AuthenticationAccountProcessor`

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

### stop() {#stop}

> **stop**(): `Promise`\<`void`\>

Stop the processor and release the cache.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the processor has stopped.

#### Implementation of

`IBaseRouteProcessor.stop`

***

### pre() {#pre}

> **pre**(`request`, `response`, `route`, `contextIds`, `processorState`): `Promise`\<`void`\>

Set the identity and organization of the signed in account on the request context.

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

\{\[`id`: `string`\]: `unknown`; \}

The state handed through the processors.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the context has been populated.

#### Implementation of

`IBaseRouteProcessor.pre`
