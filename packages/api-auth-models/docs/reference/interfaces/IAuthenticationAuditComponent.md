# Interface: IAuthenticationAuditComponent

Contract definition for authentication audit component.

## Extends

- `IComponent`

## Methods

### create() {#create}

> **create**(`entry`): `Promise`\<`string`\>

Create a new audit entry.

#### Parameters

##### entry

`Omit`\<[`IAuthenticationAuditEntry`](IAuthenticationAuditEntry.md), `"id"` \| `"dateCreated"`\>

The audit entry to be logged.

#### Returns

`Promise`\<`string`\>

The unique identifier of the created audit entry.

***

### get() {#get}

> **get**(`id`): `Promise`\<[`IAuthenticationAuditEntry`](IAuthenticationAuditEntry.md)\>

Get an audit entry by id.

#### Parameters

##### id

`string`

The unique identifier of the audit entry.

#### Returns

`Promise`\<[`IAuthenticationAuditEntry`](IAuthenticationAuditEntry.md)\>

The audit entry.

***

### update() {#update}

> **update**(`id`, `entry`): `Promise`\<`void`\>

Update an audit entry.

#### Parameters

##### id

`string`

The unique identifier of the audit entry to update.

##### entry

`Partial`\<`Omit`\<[`IAuthenticationAuditEntry`](IAuthenticationAuditEntry.md), `"id"` \| `"dateCreated"`\>\>

The fields to update on the audit entry.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the audit entry has been updated.

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

***

### query() {#query}

> **query**(`options?`, `cursor?`, `limit?`): `Promise`\<\{ `entries`: [`IAuthenticationAuditEntry`](IAuthenticationAuditEntry.md)[]; `cursor?`: `string`; \}\>

Query the audit entries.

#### Parameters

##### options?

The query options.

###### actorId?

`string`

The actor identifier to filter the audit entries, optional.

###### organizationId?

`string`

The organisation identifier to filter the audit entries, optional.

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

`Promise`\<\{ `entries`: [`IAuthenticationAuditEntry`](IAuthenticationAuditEntry.md)[]; `cursor?`: `string`; \}\>

The audit entries.
