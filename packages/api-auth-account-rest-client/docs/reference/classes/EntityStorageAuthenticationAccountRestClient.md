# Class: EntityStorageAuthenticationAccountRestClient

The client to connect to the account data service, for the data of the signed in account.

## Extends

- `BaseRestClient`

## Implements

- `IAuthenticationAccountComponent`

## Constructors

### Constructor

> **new EntityStorageAuthenticationAccountRestClient**(`config`): `EntityStorageAuthenticationAccountRestClient`

Create a new instance of EntityStorageAuthenticationAccountRestClient.

#### Parameters

##### config

`IBaseRestClientConfig`

The configuration for the client.

#### Returns

`EntityStorageAuthenticationAccountRestClient`

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

`IAuthenticationAccountComponent.className`

***

### adoptIdentity() {#adoptidentity}

> **adoptIdentity**(`identity?`, `proof?`, `sessionStart?`): `Promise`\<`string`\>

Adopt an identity for the signed in account, an account has only one.

#### Parameters

##### identity?

`string`

The DID to adopt, a new self-controlled DID is created when omitted.

##### proof?

`IProof`

A proof by the DID over the identity proof document, required with the identity.

##### sessionStart?

`number`

When the session started, the server reads it from the token of the request.

#### Returns

`Promise`\<`string`\>

The DID of the account.

#### Implementation of

`IAuthenticationAccountComponent.adoptIdentity`

***

### exportIdentity() {#exportidentity}

> **exportIdentity**(`sessionStart?`): `Promise`\<`IAccountIdentityExport`\>

Export the identity of the signed in account with its private keys and credentials.

#### Parameters

##### sessionStart?

`number`

When the session started, the server reads it from the token of the request.

#### Returns

`Promise`\<`IAccountIdentityExport`\>

The export, which contains private keys and must be protected.

#### Implementation of

`IAuthenticationAccountComponent.exportIdentity`

***

### importIdentity() {#importidentity}

> **importIdentity**(`exported`, `sessionStart?`): `Promise`\<`IAccountIdentityImportResult`\>

Import a self-controlled identity into the signed in account, instead of adopting one.

#### Parameters

##### exported

`IAccountIdentityExport`

The export of the identity and its credentials.

##### sessionStart?

`number`

When the session started, the server reads it from the token of the request.

#### Returns

`Promise`\<`IAccountIdentityImportResult`\>

The DID and what was imported.

#### Implementation of

`IAuthenticationAccountComponent.importIdentity`

***

### removeIdentity() {#removeidentity}

> **removeIdentity**(`sessionStart?`): `Promise`\<`void`\>

Remove the identity of the signed in account with its credentials and organizations.

#### Parameters

##### sessionStart?

`number`

When the session started, the server reads it from the token of the request.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the identity has been removed.

#### Implementation of

`IAuthenticationAccountComponent.removeIdentity`

***

### leaveOrganization() {#leaveorganization}

> **leaveOrganization**(`organization`): `Promise`\<`void`\>

Leave an organization with the signed in account.

#### Parameters

##### organization

`string`

The DID of the organization.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the account has left.

#### Implementation of

`IAuthenticationAccountComponent.leaveOrganization`

***

### exportProfile() {#exportprofile}

> **exportProfile**(): `Promise`\<`IAccountProfileExport`\>

Export the account data of the signed in account, other than its identity, organizations and
credentials.

#### Returns

`Promise`\<`IAccountProfileExport`\>

The export.

#### Implementation of

`IAuthenticationAccountComponent.exportProfile`

***

### importProfile() {#importprofile}

> **importProfile**(`profile`): `Promise`\<`IAccountProfileImportResult`\>

Replace the account data of the signed in account with an export.

#### Parameters

##### profile

`IAccountProfileExport`

The export.

#### Returns

`Promise`\<`IAccountProfileImportResult`\>

What was imported and removed.

#### Implementation of

`IAuthenticationAccountComponent.importProfile`

***

### joinOrganization() {#joinorganization}

> **joinOrganization**(`organization`): `Promise`\<`void`\>

Ask to join an organization with the signed in account, an admin accepts or rejects the request.

#### Parameters

##### organization

`string`

The DID of the organization to join.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the request has been made.

#### Implementation of

`IAuthenticationAccountComponent.joinOrganization`

***

### createOrganization() {#createorganization}

> **createOrganization**(`details`): `Promise`\<`IOrganization`\>

Create an organization for the signed in account, which becomes its member and org admin.

#### Parameters

##### details

`IAccountOrganizationCreate`

The profile, logo and public data of the organization.

#### Returns

`Promise`\<`IOrganization`\>

The organization.

#### Implementation of

`IAuthenticationAccountComponent.createOrganization`

***

### getPublicDataByIdentity() {#getpublicdatabyidentity}

> **getPublicDataByIdentity**(`identity`): `Promise`\<`IJsonLdNodeObject`[]\>

Get the public data of the organization or account that holds a DID.

#### Parameters

##### identity

`string`

The DID.

#### Returns

`Promise`\<`IJsonLdNodeObject`[]\>

The public JSON-LD objects, empty when nothing is public.

#### Implementation of

`IAuthenticationAccountComponent.getPublicDataByIdentity`

***

### getPublicDataByAccount() {#getpublicdatabyaccount}

> **getPublicDataByAccount**(`accountId`): `Promise`\<`IJsonLdNodeObject`[]\>

Get the public data of an account or organization.

#### Parameters

##### accountId

`string`

The account id, or the unique identifier or DID of an organization.

#### Returns

`Promise`\<`IJsonLdNodeObject`[]\>

The public JSON-LD objects, empty when nothing is public.

#### Implementation of

`IAuthenticationAccountComponent.getPublicDataByAccount`

***

### getOrganization() {#getorganization}

> **getOrganization**(): `Promise`\<`string` \| `undefined`\>

Get the organization of the signed in account.

#### Returns

`Promise`\<`string` \| `undefined`\>

The DID of the organization, or undefined while there is none or a request is pending.

#### Implementation of

`IAuthenticationAccountComponent.getOrganization`

***

### cancelOrganizationRequest() {#cancelorganizationrequest}

> **cancelOrganizationRequest**(`organization`): `Promise`\<`void`\>

Cancel the pending request of the signed in account to join an organization.

#### Parameters

##### organization

`string`

The DID of the organization whose request is cancelled.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the request has been cancelled.

#### Implementation of

`IAuthenticationAccountComponent.cancelOrganizationRequest`

***

### getOrganizationRequests() {#getorganizationrequests}

> **getOrganizationRequests**(): `Promise`\<`IOrganizationRequestDetails`[]\>

Get the requests of the signed in account to join organizations, so their status can be shown.

#### Returns

`Promise`\<`IOrganizationRequestDetails`[]\>

The latest request to each organization, pending or answered, the latest changed first.

#### Implementation of

`IAuthenticationAccountComponent.getOrganizationRequests`

***

### create() {#create}

> **create**(`type`, `data`, `isDefault?`): `Promise`\<`string`\>

Store an item for the signed in account.

#### Parameters

##### type

`string`

The type of the item.

##### data

`unknown`

The value of the item.

##### isDefault?

`boolean`

True to use the item first for its type, clearing any other default.

#### Returns

`Promise`\<`string`\>

The unique identifier of the item.

#### Implementation of

`IAuthenticationAccountComponent.create`

***

### get() {#get}

> **get**(`id`): `Promise`\<`IAuthenticationAccountData`\<`unknown`\>\>

Get an item.

#### Parameters

##### id

`string`

The unique identifier of the item.

#### Returns

`Promise`\<`IAuthenticationAccountData`\<`unknown`\>\>

The item.

#### Implementation of

`IAuthenticationAccountComponent.get`

***

### update() {#update}

> **update**(`id`, `data`, `isDefault?`): `Promise`\<`void`\>

Replace the value of an item.

#### Parameters

##### id

`string`

The unique identifier of the item.

##### data

`unknown`

The new value of the item.

##### isDefault?

`boolean`

True to use the item first for its type, clearing any other default, unchanged when omitted.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the item has been updated.

#### Implementation of

`IAuthenticationAccountComponent.update`

***

### remove() {#remove}

> **remove**(`id`): `Promise`\<`void`\>

Remove an item.

#### Parameters

##### id

`string`

The unique identifier of the item.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the item has been removed.

#### Implementation of

`IAuthenticationAccountComponent.remove`

***

### query() {#query}

> **query**(`type?`, `cursor?`, `limit?`): `Promise`\<\{ `entities`: `IAuthenticationAccountData`\<`unknown`\>[]; `cursor?`: `string`; \}\>

Query the items of the signed in account.

#### Parameters

##### type?

`string`

The type of the items to return, all types when omitted.

##### cursor?

`string`

The cursor to request the next page.

##### limit?

`number`

The maximum number of items to return.

#### Returns

`Promise`\<\{ `entities`: `IAuthenticationAccountData`\<`unknown`\>[]; `cursor?`: `string`; \}\>

The items and a cursor when there are more.

#### Implementation of

`IAuthenticationAccountComponent.query`
