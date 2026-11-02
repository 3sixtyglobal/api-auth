# Interface: IAccountOrganizationCreate

The details of an organization the signed in account creates for itself.

## Properties

### identityImport? {#identityimport}

> `optional` **identityImport?**: [`IOrganizationIdentityExport`](IOrganizationIdentityExport.md)

The file of an organization identity export, as exported, to import onto the node, controlled by
the node, instead of creating a DID, so an organization moved from another node keeps its DID.
Its revocation index carries on, and the node never goes below the index it reached when it
last registered the DID.

***

### profile? {#profile}

> `optional` **profile?**: `IJsonLdNodeObject`

The profile, such as a schema.org Organization.

***

### logo? {#logo}

> `optional` **logo?**: `IJsonLdNodeObject`

The logo, a schema.org ImageObject holding a data URL.

***

### publicData? {#publicdata}

> `optional` **publicData?**: `string`[]

The paths of the data that is public, such as profile.name or logo.
