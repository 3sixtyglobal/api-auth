# Interface: IOrganizationUpdateRequest

Change the profile, logo and public data of an organization.

## Properties

### pathParams {#pathparams}

> **pathParams**: `object`

The path parameters for the request.

#### id

> **id**: `string`

The unique identifier or the DID of the organization.

***

### body {#body}

> **body**: `object`

The changes, those omitted are unchanged.

#### profile?

> `optional` **profile?**: `IJsonLdNodeObject`

The profile, such as a schema.org Organization.

#### logo?

> `optional` **logo?**: `IJsonLdNodeObject` \| `null`

The logo, a schema.org ImageObject holding a data URL, null removes it.

#### publicData?

> `optional` **publicData?**: `string`[]

The paths of the data that is public, such as profile.name or logo.
