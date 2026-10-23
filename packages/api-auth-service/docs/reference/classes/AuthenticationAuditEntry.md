# Class: AuthenticationAuditEntry

Class defining the storage for authentication audit entries.

## Constructors

### Constructor

> **new AuthenticationAuditEntry**(): `AuthenticationAuditEntry`

#### Returns

`AuthenticationAuditEntry`

## Properties

### id {#id}

> **id**: `string`

The unique identifier for the audit entry.

***

### dateCreated {#datecreated}

> **dateCreated**: `string`

The timestamp of the audit entry in ISO 8601 format.

***

### event {#event}

> **event**: `string`

The audit event that occurred.

***

### actorId? {#actorid}

> `optional` **actorId?**: `string`

The actor identifier, could be e-mail, username, or other unique identifier.

***

### nodeId? {#nodeid}

> `optional` **nodeId?**: `string`

The node identifier associated with the audit entry, if applicable.

***

### organizationId? {#organizationid}

> `optional` **organizationId?**: `string`

The organization identifier associated with the audit entry, if applicable.

***

### tenantId? {#tenantid}

> `optional` **tenantId?**: `string`

The tenant identifier associated with the audit entry, if applicable.

***

### ipAddressHashes? {#ipaddresshashes}

> `optional` **ipAddressHashes?**: `string`[]

The hashed IP addresses of the client.

***

### userAgent? {#useragent}

> `optional` **userAgent?**: `string`

The user agent string of the client.

***

### correlationId? {#correlationid}

> `optional` **correlationId?**: `string`

The correlation ID for request tracing.

***

### data? {#data}

> `optional` **data?**: `unknown`

Additional data related to the audit entry, such as IP address, user agent, etc.
