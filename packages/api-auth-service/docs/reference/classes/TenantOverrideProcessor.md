# Class: TenantOverrideProcessor

Processes the overrideTenant query parameter for routes that allow tenant override.
Requires the caller to hold the escalated privilege role. Runs after AuthHeaderProcessor so
authentication is always resolved in the caller's own partition first.

## Implements

- `IBaseRouteProcessor`

## Constructors

### Constructor

> **new TenantOverrideProcessor**(`options?`): `TenantOverrideProcessor`

Create a new instance of TenantOverrideProcessor.

#### Parameters

##### options?

[`ITenantOverrideProcessorConstructorOptions`](../interfaces/ITenantOverrideProcessorConstructorOptions.md)

Options for the processor.

#### Returns

`TenantOverrideProcessor`

## Properties

### OVERRIDE\_TENANT\_PARAM {#override_tenant_param}

> `readonly` `static` **OVERRIDE\_TENANT\_PARAM**: `string` = `"override-tenant"`

The query parameter name used to supply the override tenant ID.

***

### DEFAULT\_ESCALATED\_PRIVILEGE\_ROLE {#default_escalated_privilege_role}

> `readonly` `static` **DEFAULT\_ESCALATED\_PRIVILEGE\_ROLE**: `string` = `"global-admin"`

The role string required to perform a tenant override.

***

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

A promise that resolves when the tenant override has been applied or skipped.

#### Implementation of

`IBaseRouteProcessor.pre`
