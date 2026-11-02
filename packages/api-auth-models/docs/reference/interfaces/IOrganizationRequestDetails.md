# Interface: IOrganizationRequestDetails

A request by an account to join an organization.

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

> **status**: [`OrganizationRequestStatus`](../type-aliases/OrganizationRequestStatus.md)

The status of the request.

***

### reason? {#reason}

> `optional` **reason?**: `string`

The i18n key of the reason given when the request was rejected, for the client to translate.

***

### dateCreated {#datecreated}

> **dateCreated**: `string`

When the request was made, in ISO date format.

***

### dateModified {#datemodified}

> **dateModified**: `string`

When the request was last modified, in ISO date format.
