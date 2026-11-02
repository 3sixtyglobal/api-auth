# Interface: IOrganizationComponent

Contract for the organizations registered on the node.

## Extends

- `IComponent`

## Methods

### create() {#create}

> **create**(`organization`): `Promise`\<[`IOrganization`](IOrganization.md)\>

Create an organization, only admins may.

#### Parameters

##### organization

[`IOrganizationCreate`](IOrganizationCreate.md)

The details of the organization.

#### Returns

`Promise`\<[`IOrganization`](IOrganization.md)\>

The organization.

***

### get() {#get}

> **get**(`id`): `Promise`\<[`IOrganization`](IOrganization.md)\>

Get an organization, the profile, logo and public data are only included for its members and
admins, others get the public data.

#### Parameters

##### id

`string`

The unique identifier or the DID of the organization.

#### Returns

`Promise`\<[`IOrganization`](IOrganization.md)\>

The organization.

***

### query() {#query}

> **query**(`cursor?`, `limit?`): `Promise`\<\{ `entities`: [`IOrganization`](IOrganization.md)[]; `cursor?`: `string`; \}\>

Query the organizations, the earliest first, only admins may.

#### Parameters

##### cursor?

`string`

The cursor to request the next page.

##### limit?

`number`

The maximum number of organizations to return.

#### Returns

`Promise`\<\{ `entities`: [`IOrganization`](IOrganization.md)[]; `cursor?`: `string`; \}\>

The organizations, without their profiles, and a cursor when there are more.

***

### search() {#search}

> **search**(`name`, `limit?`): `Promise`\<\{ `entities`: [`IOrganization`](IOrganization.md)[]; \}\>

Search the organizations whose name starts with the text given, without case, any signed in
account may.

#### Parameters

##### name

`string`

The start of the name.

##### limit?

`number`

The maximum number of organizations to return.

#### Returns

`Promise`\<\{ `entities`: [`IOrganization`](IOrganization.md)[]; \}\>

The organizations with their names and the public properties of their profiles.

***

### update() {#update}

> **update**(`id`, `changes`): `Promise`\<`void`\>

Change the profile, logo and public data of an organization, those omitted are unchanged, its
org admins and admins may.

#### Parameters

##### id

`string`

The unique identifier or the DID of the organization.

##### changes

[`IOrganizationProfileUpdate`](IOrganizationProfileUpdate.md)

The profile, logo and public data.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the organization has been changed.

***

### queryMembers() {#querymembers}

> **queryMembers**(`id`, `cursor?`, `limit?`): `Promise`\<\{ `entities`: [`IOrganizationMember`](IOrganizationMember.md)[]; `cursor?`: `string`; \}\>

Query the members of an organization, its members, org admins and admins may.

#### Parameters

##### id

`string`

The unique identifier or the DID of the organization.

##### cursor?

`string`

The cursor to request the next page.

##### limit?

`number`

The maximum number of members to return.

#### Returns

`Promise`\<\{ `entities`: [`IOrganizationMember`](IOrganizationMember.md)[]; `cursor?`: `string`; \}\>

The members and a cursor when there are more.

***

### addAdmin() {#addadmin}

> **addAdmin**(`id`, `accountId`): `Promise`\<`void`\>

Make a member an org admin of an organization, its org admins and admins may.

#### Parameters

##### id

`string`

The unique identifier or the DID of the organization.

##### accountId

`string`

The account of the member.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the member is an org admin.

***

### removeAdmin() {#removeadmin}

> **removeAdmin**(`id`, `accountId`): `Promise`\<`void`\>

Stop a member being an org admin of an organization, its org admins and admins may, only
global admins may remove the last org admin.

#### Parameters

##### id

`string`

The unique identifier or the DID of the organization.

##### accountId

`string`

The account of the member.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the member is no longer an org admin.

***

### exportIdentity() {#exportidentity}

> **exportIdentity**(`id`, `sessionStart?`): `Promise`\<[`IOrganizationIdentityExport`](IOrganizationIdentityExport.md)\>

Export the identity of an organization with its private keys, only admins may, and only for
an organization whose keys the node holds.

#### Parameters

##### id

`string`

The unique identifier or the DID of the organization.

##### sessionStart?

`number`

When the session of the caller started in seconds, it must be recent.

#### Returns

`Promise`\<[`IOrganizationIdentityExport`](IOrganizationIdentityExport.md)\>

The export with the revocation index the organization reached, which contains private
keys and must be protected.

***

### remove() {#remove}

> **remove**(`id`): `Promise`\<`void`\>

Remove an organization that has no members, only admins may, or an org admin who is its only
member, ending their membership.

#### Parameters

##### id

`string`

The unique identifier or the DID of the organization.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the organization has been removed.
