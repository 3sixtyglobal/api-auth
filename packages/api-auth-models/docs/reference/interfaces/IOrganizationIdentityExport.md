# Interface: IOrganizationIdentityExport

The export of the identity of an organization, with what the node needs to carry on issuing
membership credentials for it. It contains private keys and must be protected.

## Properties

### type {#type}

> **type**: `"organization-identity"`

The type of the file, checked first when it is imported.

***

### version {#version}

> **version**: `number`

The version of the file.

***

### identity {#identity}

> **identity**: `IIdentityExport`

The identity with its private keys.

***

### nextRevocationIndex? {#nextrevocationindex}

> `optional` **nextRevocationIndex?**: `number`

The revocation index to give the next membership credential the organization issues, so an
import never gives a credential an index already used.
