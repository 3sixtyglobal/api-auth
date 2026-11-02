# Class: OrganizationRequest

Class defining the storage for a request by an account to join an organization.

## Constructors

### Constructor

> **new OrganizationRequest**(): `OrganizationRequest`

#### Returns

`OrganizationRequest`

## Properties

### id {#id}

> **id**: `string`

The unique identifier of the request.

***

### accountId {#accountid}

> **accountId**: `string`

The account asking to join.

***

### organization {#organization}

> **organization**: `string`

The DID of the organization to join.

***

### status {#status}

> **status**: `OrganizationRequestStatus`

The status of the request.

***

### reason? {#reason}

> `optional` **reason?**: `string`

The i18n key of the reason given when the request was rejected.

***

### dateCreated {#datecreated}

> **dateCreated**: `string`

When the request was made, in ISO date format.

***

### dateModified {#datemodified}

> **dateModified**: `string`

When the request was last modified, in ISO date format.
