# Class: Organization

Class defining the storage for an organization registered on the node, its profiles are held as
account data owned by its id.

## Constructors

### Constructor

> **new Organization**(): `Organization`

#### Returns

`Organization`

## Properties

### id {#id}

> **id**: `string`

The unique identifier of the organization.

***

### identity {#identity}

> **identity**: `string`

The DID of the organization, held by only one organization.

***

### searchName {#searchname}

> **searchName**: `string`

The name from the profile in lower case, to search the organizations by name, empty when it has none.

***

### nextRevocationIndex? {#nextrevocationindex}

> `optional` **nextRevocationIndex?**: `number`

The revocation index to give the next membership credential the organization issues, zero
when omitted.

***

### identityHeld? {#identityheld}

> `optional` **identityHeld?**: `boolean`

True when the node created or imported the DID, so its keys are removed with the organization.

***

### dateCreated {#datecreated}

> **dateCreated**: `string`

When the organization was created, in ISO date format.

***

### dateModified {#datemodified}

> **dateModified**: `string`

When the organization was last modified, in ISO date format.
