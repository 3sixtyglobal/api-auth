# Interface: IOrganizationCreate

The details of an organization to create.

## Properties

### identity? {#identity}

> `optional` **identity?**: `string`

The DID of an existing organization to register, a node controlled DID is created when omitted.

***

### identityImport? {#identityimport}

> `optional` **identityImport?**: [`IOrganizationIdentityExport`](IOrganizationIdentityExport.md)

The file of an organization identity export, as exported, to import onto the node and register,
controlled by the node, instead of creating or naming one. Not allowed with the identity or
proof. Its revocation index carries on, and the node never goes below the index it reached when
it last registered the DID.

***

### proof? {#proof}

> `optional` **proof?**: `IProof`

A proof by the DID over the organization proof document, required with the identity unless
the caller is the node itself.

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
