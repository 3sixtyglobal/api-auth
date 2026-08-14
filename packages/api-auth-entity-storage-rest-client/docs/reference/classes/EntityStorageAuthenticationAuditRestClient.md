# Class: EntityStorageAuthenticationAuditRestClient

The client to connect to the authentication audit service.

## Extends

- `BaseRestClient`

## Implements

- `IAuthenticationAuditComponent`

## Constructors

### Constructor

> **new EntityStorageAuthenticationAuditRestClient**(`config`): `EntityStorageAuthenticationAuditRestClient`

Create a new instance of EntityStorageAuthenticationAuditRestClient.

#### Parameters

##### config

`IBaseRestClientConfig`

The configuration for the client.

#### Returns

`EntityStorageAuthenticationAuditRestClient`

#### Overrides

`BaseRestClient.constructor`

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

`IAuthenticationAuditComponent.className`

***

### create() {#create}

> **create**(`entry`): `Promise`\<`string`\>

Create a new audit entry.

#### Parameters

##### entry

`Omit`\<`IAuthenticationAuditEntry`, `"id"` \| `"dateCreated"`\>

The audit entry to be logged.

#### Returns

`Promise`\<`string`\>

The unique identifier of the created audit entry.

#### Implementation of

`IAuthenticationAuditComponent.create`

***

### get() {#get}

> **get**(`id`): `Promise`\<`IAuthenticationAuditEntry`\>

Get an audit entry by id.

#### Parameters

##### id

`string`

The unique identifier of the audit entry.

#### Returns

`Promise`\<`IAuthenticationAuditEntry`\>

The audit entry.

#### Implementation of

`IAuthenticationAuditComponent.get`

***

### update() {#update}

> **update**(`id`, `entry`): `Promise`\<`void`\>

Update an audit entry.

#### Parameters

##### id

`string`

The unique identifier of the audit entry to update.

##### entry

`Partial`\<`Omit`\<`IAuthenticationAuditEntry`, `"id"` \| `"dateCreated"`\>\>

The fields to update on the audit entry.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the audit entry has been updated.

#### Implementation of

`IAuthenticationAuditComponent.update`

***

### remove() {#remove}

> **remove**(`id`): `Promise`\<`void`\>

Remove an audit entry.

#### Parameters

##### id

`string`

The unique identifier of the audit entry to remove.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the audit entry has been removed.

#### Implementation of

`IAuthenticationAuditComponent.remove`

***

### query() {#query}

> **query**(`options?`, `cursor?`, `limit?`): `Promise`\<\{ `entries`: `IAuthenticationAuditEntry`[]; `cursor?`: `string`; \}\>

Query the audit entries.

#### Parameters

##### options?

The query options.

###### actorId?

`string`

The actor identifier to filter the audit entries, optional.

###### organizationId?

`string`

The organization identifier to filter the audit entries, optional.

###### tenantId?

`string`

The tenant identifier to filter the audit entries, optional.

###### nodeId?

`string`

The node identifier to filter the audit entries, optional.

###### event?

`string`

The audit event to filter the audit entries, optional.

###### startDate?

`string`

The start date to filter the audit entries, optional.

###### endDate?

`string`

The end date to filter the audit entries, optional.

##### cursor?

`string`

The cursor for pagination.

##### limit?

`number`

The maximum number of entries to return.

#### Returns

`Promise`\<\{ `entries`: `IAuthenticationAuditEntry`[]; `cursor?`: `string`; \}\>

The audit entries.

#### Implementation of

`IAuthenticationAuditComponent.query`

***

### getEndpointWithPrefix() {#getendpointwithprefix}

> **getEndpointWithPrefix**(): `string`

Get the endpoint with the prefix for the namespace.

#### Returns

`string`

The endpoint with namespace prefix attached.

#### Inherited from

`BaseRestClient.getEndpointWithPrefix`

***

### getPathPrefix() {#getpathprefix}

> **getPathPrefix**(): `string`

Get the path prefix as a URL path string provided in the constructor.

#### Returns

`string`

The path prefix.

#### Inherited from

`BaseRestClient.getPathPrefix`

***

### fetch() {#fetch}

> **fetch**\<`T`, `U`\>(`route`, `method`, `request?`, `options?`): `Promise`\<`U`\>

Perform a request in json format.

#### Type Parameters

##### T

`T` *extends* `IHttpRequest`\<`any`\>

##### U

`U` *extends* `IHttpResponse`\<`any`\>

#### Parameters

##### route

`string`

The route of the request.

##### method

`HttpMethod`

The http method.

##### request?

`T`

Request to send to the endpoint.

##### options?

Optional override options for the request.

###### overridePrefix?

`string`

Optional override prefix to use for this request instead of the default prefix.

#### Returns

`Promise`\<`U`\>

The response.

#### Inherited from

`BaseRestClient.fetch`
