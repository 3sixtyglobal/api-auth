# Class: EntityStorageAuthenticationAuditService

Implementation of the authentication audit component using entity storage.

## Implements

- `IAuthenticationAuditComponent`

## Constructors

### Constructor

> **new EntityStorageAuthenticationAuditService**(`options?`): `EntityStorageAuthenticationAuditService`

Create a new instance of EntityStorageAuthenticationAuditService.

#### Parameters

##### options?

[`IEntityStorageAuthenticationAuditServiceConstructorOptions`](../interfaces/IEntityStorageAuthenticationAuditServiceConstructorOptions.md)

The dependencies for the identity connector.

#### Returns

`EntityStorageAuthenticationAuditService`

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
