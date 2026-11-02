# Interface: IOrganization

An organization registered on the node.

## Properties

### id {#id}

> **id**: `string`

The unique identifier of the organization.

***

### identity {#identity}

> **identity**: `string`

The DID of the organization.

***

### profile? {#profile}

> `optional` **profile?**: `IJsonLdNodeObject`

The profile, such as a schema.org Organization, only for its members and admins.

***

### logo? {#logo}

> `optional` **logo?**: `IJsonLdNodeObject`

The logo, a schema.org ImageObject holding a data URL, only for its members and admins.

***

### publicData? {#publicdata}

> `optional` **publicData?**: `string`[]

The paths of the data that is public, only for its members and admins.

***

### public? {#public}

> `optional` **public?**: `IJsonLdNodeObject`[]

The public data, a JSON-LD object for each type its public data paths name, for callers who
are not its members or admins, and in a search, where the name is always included.

***

### isAdmin? {#isadmin}

> `optional` **isAdmin?**: `boolean`

True when the signed in caller is an org admin of the organization.

***

### dateCreated {#datecreated}

> **dateCreated**: `string`

When the organization was created, in ISO date format.

***

### dateModified {#datemodified}

> **dateModified**: `string`

When the organization was last modified, in ISO date format.
