# Interface: IOrganizationProfileUpdate

The changes to the profile, logo and public data of an organization, those omitted are unchanged.

## Properties

### profile? {#profile}

> `optional` **profile?**: `IJsonLdNodeObject`

The profile, such as a schema.org Organization.

***

### logo? {#logo}

> `optional` **logo?**: `IJsonLdNodeObject` \| `null`

The logo, a schema.org ImageObject holding a data URL, null removes it.

***

### publicData? {#publicdata}

> `optional` **publicData?**: `string`[]

The paths of the data that is public, such as profile.name or logo.
