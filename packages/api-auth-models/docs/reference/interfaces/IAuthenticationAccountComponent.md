# Interface: IAuthenticationAccountComponent

Contract for the data stored for the signed in account.
The identity and organization types are only set through adoptIdentity and joinOrganization, and
verifiable credentials by the node.

## Extends

- `IComponent`

## Methods

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

When the session of the caller started in seconds, it must be recent.

#### Returns

`Promise`\<`string`\>

The DID of the account.

#### Throws

ConflictError when the account already has an identity or the DID is in use.

#### Throws

UnauthorizedError when the proof does not show the DID is owned by the caller, or the
session did not start recently.

***

### exportIdentity() {#exportidentity}

> **exportIdentity**(`sessionStart?`): `Promise`\<[`IAccountIdentityExport`](IAccountIdentityExport.md)\>

Export the identity of the signed in account with its private keys and the credentials the
account holds, only when the node holds the keys of the identity.

#### Parameters

##### sessionStart?

`number`

When the session of the caller started in seconds, it must be recent.

#### Returns

`Promise`\<[`IAccountIdentityExport`](IAccountIdentityExport.md)\>

The export, which contains private keys and must be protected.

#### Throws

UnauthorizedError when the session did not start recently.

#### Throws

NotFoundError when the account has no identity.

#### Throws

UnprocessableError when the node does not hold the keys of the identity.

***

### importIdentity() {#importidentity}

> **importIdentity**(`exported`, `sessionStart?`): `Promise`\<[`IAccountIdentityImportResult`](IAccountIdentityImportResult.md)\>

Import a self-controlled identity into the signed in account, instead of adopting one. The
credentials that verify and are issued to the identity are stored, and the account becomes a
member of the registered organizations whose revocable membership credentials it holds.

#### Parameters

##### exported

[`IAccountIdentityExport`](IAccountIdentityExport.md)

The export of the identity and its credentials.

##### sessionStart?

`number`

When the session of the caller started in seconds, it must be recent.

#### Returns

`Promise`\<[`IAccountIdentityImportResult`](IAccountIdentityImportResult.md)\>

The DID and what was imported.

#### Throws

ConflictError when the account already has an identity, or the DID is held.

#### Throws

UnauthorizedError when the session did not start recently.

***

### removeIdentity() {#removeidentity}

> **removeIdentity**(`sessionStart?`): `Promise`\<`void`\>

Remove the identity of the signed in account with its credentials, organizations and pending
requests to join one, and remove the keys the node holds for it.

#### Parameters

##### sessionStart?

`number`

When the session of the caller started in seconds, it must be recent.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the identity has been removed.

#### Throws

UnauthorizedError when the session did not start recently.

#### Throws

NotFoundError when the account has no identity.

***

### leaveOrganization() {#leaveorganization}

> **leaveOrganization**(`organization`): `Promise`\<`void`\>

Leave an organization with the signed in account, removing the organization and the
membership credentials it issued.

#### Parameters

##### organization

`string`

The DID of the organization.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the account has left.

#### Throws

NotFoundError when the account is not in the organization.

***

### exportProfile() {#exportprofile}

> **exportProfile**(): `Promise`\<[`IAccountProfileExport`](IAccountProfileExport.md)\>

Export the account data of the signed in account, other than its identity, organizations,
credentials and node migration records.

#### Returns

`Promise`\<[`IAccountProfileExport`](IAccountProfileExport.md)\>

The export.

***

### importProfile() {#importprofile}

> **importProfile**(`profile`): `Promise`\<[`IAccountProfileImportResult`](IAccountProfileImportResult.md)\>

Replace the account data of the signed in account with an export, the types the export may
hold are replaced, items owned by an authentication provider are kept.

#### Parameters

##### profile

[`IAccountProfileExport`](IAccountProfileExport.md)

The export.

#### Returns

`Promise`\<[`IAccountProfileImportResult`](IAccountProfileImportResult.md)\>

What was imported and removed.

#### Throws

UnprocessableError when the export is not valid or too large.

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

#### Throws

UnprocessableError when the account has no identity.

#### Throws

ConflictError when the account is already in the organization or has a request pending.

***

### createOrganization() {#createorganization}

> **createOrganization**(`details`): `Promise`\<[`IOrganization`](IOrganization.md)\>

Create an organization with a DID the node holds for the signed in account, which becomes its
member, with a membership credential, and its org admin.

#### Parameters

##### details

[`IAccountOrganizationCreate`](IAccountOrganizationCreate.md)

The profile, logo and public data of the organization.

#### Returns

`Promise`\<[`IOrganization`](IOrganization.md)\>

The organization.

#### Throws

UnprocessableError when the account has no identity.

#### Throws

ConflictError when the account has an organization or a request to join one pending.

***

### getPublicDataByIdentity() {#getpublicdatabyidentity}

> **getPublicDataByIdentity**(`identity`): `Promise`\<`IJsonLdNodeObject`[]\>

Get the public data of the organization or account that holds a DID, no sign in is needed.

#### Parameters

##### identity

`string`

The DID.

#### Returns

`Promise`\<`IJsonLdNodeObject`[]\>

The public JSON-LD objects, empty when nothing is public.

#### Throws

NotFoundError when no organization or account holds the DID.

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

#### Throws

NotFoundError when nothing is stored for it.

***

### getOrganization() {#getorganization}

> **getOrganization**(): `Promise`\<`string` \| `undefined`\>

Get the organization of the signed in account.

#### Returns

`Promise`\<`string` \| `undefined`\>

The DID of the organization, or undefined while there is none or a request is pending.

#### Throws

UnprocessableError when the account has no organization and its latest request to join
one was rejected, with the organization and the i18n key of the reason.

***

### cancelOrganizationRequest() {#cancelorganizationrequest}

> **cancelOrganizationRequest**(`organization`): `Promise`\<`void`\>

Cancel the pending request of the signed in account to join an organization. The requests
answered before are kept, so the latest of them is the status again.

#### Parameters

##### organization

`string`

The DID of the organization whose request is cancelled.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the request has been cancelled.

#### Throws

NotFoundError when no request to the organization is pending.

***

### getOrganizationRequests() {#getorganizationrequests}

> **getOrganizationRequests**(): `Promise`\<[`IOrganizationRequestDetails`](IOrganizationRequestDetails.md)[]\>

Get the requests of the signed in account to join organizations, so their status can be shown.

#### Returns

`Promise`\<[`IOrganizationRequestDetails`](IOrganizationRequestDetails.md)[]\>

The latest request to each organization, pending or answered, the latest changed first.

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

***

### get() {#get}

> **get**(`id`): `Promise`\<[`IAuthenticationAccountData`](IAuthenticationAccountData.md)\<`unknown`\>\>

Get an item of the signed in account.

#### Parameters

##### id

`string`

The unique identifier of the item.

#### Returns

`Promise`\<[`IAuthenticationAccountData`](IAuthenticationAccountData.md)\<`unknown`\>\>

The item.

#### Throws

NotFoundError when the item does not exist or belongs to another account.

***

### update() {#update}

> **update**(`id`, `data`, `isDefault?`): `Promise`\<`void`\>

Replace the value of an item of the signed in account.

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

#### Throws

NotFoundError when the item does not exist or belongs to another account.

***

### remove() {#remove}

> **remove**(`id`): `Promise`\<`void`\>

Remove an item of the signed in account.

#### Parameters

##### id

`string`

The unique identifier of the item.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the item has been removed.

#### Throws

NotFoundError when the item does not exist or belongs to another account.

***

### query() {#query}

> **query**(`type?`, `cursor?`, `limit?`): `Promise`\<\{ `entities`: [`IAuthenticationAccountData`](IAuthenticationAccountData.md)\<`unknown`\>[]; `cursor?`: `string`; \}\>

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

`Promise`\<\{ `entities`: [`IAuthenticationAccountData`](IAuthenticationAccountData.md)\<`unknown`\>[]; `cursor?`: `string`; \}\>

The items and a cursor when there are more.
