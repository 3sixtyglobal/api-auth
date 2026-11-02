# Class: OrganizationRestClient

The client to connect to the service that manages the organizations registered on the node.

## Extends

- `BaseRestClient`

## Implements

- `IOrganizationComponent`

## Constructors

### Constructor

> **new OrganizationRestClient**(`config`): `OrganizationRestClient`

Create a new instance of OrganizationRestClient.

#### Parameters

##### config

`IBaseRestClientConfig`

The configuration for the client.

#### Returns

`OrganizationRestClient`

#### Overrides

`BaseRestClient.constructor`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

## Methods

### className() {#classname}

> **className**(): `string`

Returns the class name of the component.

#### Returns

`string`

The class name of the component.

#### Implementation of

`IOrganizationComponent.className`

***

### create() {#create}

> **create**(`organization`): `Promise`\<`IOrganization`\>

Create an organization.

#### Parameters

##### organization

`IOrganizationCreate`

The details of the organization.

#### Returns

`Promise`\<`IOrganization`\>

The organization.

#### Implementation of

`IOrganizationComponent.create`

***

### get() {#get}

> **get**(`id`): `Promise`\<`IOrganization`\>

Get an organization.

#### Parameters

##### id

`string`

The unique identifier or the DID of the organization.

#### Returns

`Promise`\<`IOrganization`\>

The organization.

#### Implementation of

`IOrganizationComponent.get`

***

### query() {#query}

> **query**(`cursor?`, `limit?`): `Promise`\<\{ `entities`: `IOrganization`[]; `cursor?`: `string`; \}\>

Query the organizations, the earliest first.

#### Parameters

##### cursor?

`string`

The cursor to request the next page.

##### limit?

`number`

The maximum number of organizations to return.

#### Returns

`Promise`\<\{ `entities`: `IOrganization`[]; `cursor?`: `string`; \}\>

The organizations and a cursor when there are more.

#### Implementation of

`IOrganizationComponent.query`

***

### search() {#search}

> **search**(`name`, `limit?`): `Promise`\<\{ `entities`: `IOrganization`[]; \}\>

Search the organizations whose name starts with the text given, without case.

#### Parameters

##### name

`string`

The start of the name.

##### limit?

`number`

The maximum number of organizations to return.

#### Returns

`Promise`\<\{ `entities`: `IOrganization`[]; \}\>

The organizations with their names and the public properties of their profiles.

#### Implementation of

`IOrganizationComponent.search`

***

### update() {#update}

> **update**(`id`, `changes`): `Promise`\<`void`\>

Change the profile, logo and public data of an organization, those omitted are unchanged.

#### Parameters

##### id

`string`

The unique identifier or the DID of the organization.

##### changes

`IOrganizationProfileUpdate`

The profile, logo and public data.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the organization has been changed.

#### Implementation of

`IOrganizationComponent.update`

***

### queryMembers() {#querymembers}

> **queryMembers**(`id`, `cursor?`, `limit?`): `Promise`\<\{ `entities`: `IOrganizationMember`[]; `cursor?`: `string`; \}\>

Query the members of an organization.

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

`Promise`\<\{ `entities`: `IOrganizationMember`[]; `cursor?`: `string`; \}\>

The members and a cursor when there are more.

#### Implementation of

`IOrganizationComponent.queryMembers`

***

### addAdmin() {#addadmin}

> **addAdmin**(`id`, `accountId`): `Promise`\<`void`\>

Make a member an org admin of an organization.

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

#### Implementation of

`IOrganizationComponent.addAdmin`

***

### removeAdmin() {#removeadmin}

> **removeAdmin**(`id`, `accountId`): `Promise`\<`void`\>

Stop a member being an org admin of an organization.

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

#### Implementation of

`IOrganizationComponent.removeAdmin`

***

### exportIdentity() {#exportidentity}

> **exportIdentity**(`id`, `sessionStart?`): `Promise`\<`IOrganizationIdentityExport`\>

Export the identity of an organization with its private keys.

#### Parameters

##### id

`string`

The unique identifier or the DID of the organization.

##### sessionStart?

`number`

When the session started, the server reads it from the token of the request.

#### Returns

`Promise`\<`IOrganizationIdentityExport`\>

The export with the revocation index the organization reached, which contains private
keys and must be protected.

#### Implementation of

`IOrganizationComponent.exportIdentity`

***

### remove() {#remove}

> **remove**(`id`): `Promise`\<`void`\>

Remove an organization that has no members, or of which the calling org admin is the only member.

#### Parameters

##### id

`string`

The unique identifier or the DID of the organization.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the organization has been removed.

#### Implementation of

`IOrganizationComponent.remove`
