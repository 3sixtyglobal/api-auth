# Class: EntityStorageAuthenticationAccountService

Stores the data of the signed in account using entity storage.

## Implements

- `IAuthenticationAccountComponent`

## Constructors

### Constructor

> **new EntityStorageAuthenticationAccountService**(`options?`): `EntityStorageAuthenticationAccountService`

Create a new instance of EntityStorageAuthenticationAccountService.

#### Parameters

##### options?

[`IEntityStorageAuthenticationAccountServiceConstructorOptions`](../interfaces/IEntityStorageAuthenticationAccountServiceConstructorOptions.md)

The options for the service.

#### Returns

`EntityStorageAuthenticationAccountService`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

***

### MIGRATION\_TYPE {#migration_type}

> `readonly` `static` **MIGRATION\_TYPE**: `string` = `AccountDataHelper.MIGRATION_TYPE`

The type of the records the node migration keeps until its pending work is done, hidden from
account data listings.

***

### RESERVED\_TYPES {#reserved_types}

> `readonly` `static` **RESERVED\_TYPES**: `string`[]

The types only set through adoptIdentity and joinOrganization, as they grant the account its
identity and organization, and the migration records. They are matched once normalised.

***

### RATE\_ACTION\_ADOPT\_IDENTITY {#rate_action_adopt_identity}

> `readonly` `static` **RATE\_ACTION\_ADOPT\_IDENTITY**: `string` = `"adopt-identity"`

The rate limit action for adopting an identity.

***

### RATE\_ACTION\_EXPORT\_IDENTITY {#rate_action_export_identity}

> `readonly` `static` **RATE\_ACTION\_EXPORT\_IDENTITY**: `string` = `"export-identity"`

The rate limit action for exporting the identity.

***

### RATE\_ACTION\_IMPORT\_IDENTITY {#rate_action_import_identity}

> `readonly` `static` **RATE\_ACTION\_IMPORT\_IDENTITY**: `string` = `"import-identity"`

The rate limit action for importing an identity.

***

### RATE\_ACTION\_EXPORT\_PROFILE {#rate_action_export_profile}

> `readonly` `static` **RATE\_ACTION\_EXPORT\_PROFILE**: `string` = `"export-profile"`

The rate limit action for exporting the account data.

***

### RATE\_ACTION\_IMPORT\_PROFILE {#rate_action_import_profile}

> `readonly` `static` **RATE\_ACTION\_IMPORT\_PROFILE**: `string` = `"import-profile"`

The rate limit action for importing account data.

***

### DEFAULT\_IDENTITY\_IMPORT\_MAX\_CREDENTIALS {#default_identity_import_max_credentials}

> `readonly` `static` **DEFAULT\_IDENTITY\_IMPORT\_MAX\_CREDENTIALS**: `number` = `100`

The default most credentials an identity import may hold.

***

### DEFAULT\_VERIFICATION\_METHOD\_ID {#default_verification_method_id}

> `readonly` `static` **DEFAULT\_VERIFICATION\_METHOD\_ID**: `string` = `"trust-assertion"`

The default verification method of the organization that signs the membership credential.

***

### DEFAULT\_AUTHORIZATION\_MODEL\_ID {#default_authorization_model_id}

> `readonly` `static` **DEFAULT\_AUTHORIZATION\_MODEL\_ID**: `string` = `"system"`

The default authorization model ID the org admin roles are held in.

***

### DEFAULT\_MAX\_ITEMS {#default_max_items}

> `readonly` `static` **DEFAULT\_MAX\_ITEMS**: `number` = `1000`

The default most items an account may store itself.

***

### DEFAULT\_MAX\_ITEMS\_BY\_TYPE {#default_max_items_by_type}

> `readonly` `static` **DEFAULT\_MAX\_ITEMS\_BY\_TYPE**: `object`

The default most items of a type an account may store itself, by type.

#### Index Signature

\[`type`: `string`\]: `number`

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

### start() {#start}

> **start**(`nodeLoggingComponentType?`): `Promise`\<`void`\>

The service needs to be started when the application is initialized.

#### Parameters

##### nodeLoggingComponentType?

`string`

The node logging component type.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the rate limit actions have been registered.

#### Implementation of

`IAuthenticationAccountComponent.start`

***

### stop() {#stop}

> **stop**(`nodeLoggingComponentType?`): `Promise`\<`void`\>

The component needs to be stopped when the node is closed.

#### Parameters

##### nodeLoggingComponentType?

`string`

The node logging component type.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the rate limit actions have been unregistered.

#### Implementation of

`IAuthenticationAccountComponent.stop`

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

When the session of the caller started in seconds, it must be recent.

#### Returns

`Promise`\<`string`\>

The DID of the account.

#### Throws

ConflictError when the account already has an identity, or the DID is held by an
account, the node or an organization.

#### Throws

UnauthorizedError when the proof does not show the DID is owned by the caller, or the
session did not start recently.

#### Throws

TooManyRequestsError when the account adopts too often.

#### Implementation of

`IAuthenticationAccountComponent.adoptIdentity`

***

### createAccountIdentity() {#createaccountidentity}

> **createAccountIdentity**(`accountId`): `Promise`\<`string`\>

Create a self-controlled DID for an account that has none and give it to the account, for the
account admin service, which checks the caller first. Organizations the account was added to
before it had an identity get their credential.

#### Parameters

##### accountId

`string`

The account.

#### Returns

`Promise`\<`string`\>

The DID of the account.

#### Throws

ConflictError when the account already has an identity.

***

### exportIdentity() {#exportidentity}

> **exportIdentity**(`sessionStart?`): `Promise`\<`IAccountIdentityExport`\>

Export the identity of the signed in account with its private keys and the credentials the
account holds, only when the node holds the keys of the identity.

#### Parameters

##### sessionStart?

`number`

When the session of the caller started in seconds, it must be recent.

#### Returns

`Promise`\<`IAccountIdentityExport`\>

The export, which contains private keys and must be protected.

#### Throws

UnauthorizedError when the session did not start recently.

#### Throws

NotFoundError when the account has no identity.

#### Throws

UnprocessableError when the node does not hold the keys of the identity.

#### Throws

TooManyRequestsError when the account exports too often.

#### Implementation of

`IAuthenticationAccountComponent.exportIdentity`

***

### exportAccountIdentity() {#exportaccountidentity}

> **exportAccountIdentity**(`accountId`): `Promise`\<`IAccountIdentityExport`\>

Export the identity of an account with its private keys and the credentials it holds, for the
account itself and the account admin service, which check the caller first.

#### Parameters

##### accountId

`string`

The account.

#### Returns

`Promise`\<`IAccountIdentityExport`\>

The export, which contains private keys and must be protected.

#### Throws

NotFoundError when the account has no identity.

#### Throws

UnprocessableError when the node does not hold the keys of the identity.

***

### importIdentity() {#importidentity}

> **importIdentity**(`exported`, `sessionStart?`): `Promise`\<`IAccountIdentityImportResult`\>

Import a self-controlled identity into the signed in account, instead of adopting one. Each
credential is verified in full and stored when it is issued to the identity and not revoked,
the others are skipped. The account becomes a member of each registered organization whose
membership credential it holds, without any role, only when the credential carries a
revocation status the node can check, so a membership that ended, whose credential was
revoked, is not restored. A credential without a revocation status is stored as a credential
only. The identity is removed from the node again when binding it fails.

#### Parameters

##### exported

`IAccountIdentityExport`

The export of the identity and its credentials.

##### sessionStart?

`number`

When the session of the caller started in seconds, it must be recent.

#### Returns

`Promise`\<`IAccountIdentityImportResult`\>

The DID and what was imported.

#### Throws

UnprocessableError when the export is not valid or not self-controlled.

#### Throws

ConflictError when the account already has an identity, or the DID is held.

#### Throws

UnauthorizedError when the session did not start recently.

#### Throws

TooManyRequestsError when the account imports too often.

#### Implementation of

`IAuthenticationAccountComponent.importIdentity`

***

### importAccountIdentity() {#importaccountidentity}

> **importAccountIdentity**(`accountId`, `exported`): `Promise`\<`IAccountIdentityImportResult`\>

Import a self-controlled identity into an account, for the account itself and the account
admin service, which check the caller first. See importIdentity for what is imported.

#### Parameters

##### accountId

`string`

The account.

##### exported

`IAccountIdentityExport`

The export of the identity and its credentials.

#### Returns

`Promise`\<`IAccountIdentityImportResult`\>

The DID and what was imported.

#### Throws

UnprocessableError when the export is not valid or not self-controlled.

#### Throws

ConflictError when the account already has an identity, or the DID is held.

***

### removeIdentity() {#removeidentity}

> **removeIdentity**(`sessionStart?`): `Promise`\<`void`\>

Remove the identity of the signed in account with its credentials, organizations and pending
requests to join one. The keys the node holds for the identity are removed, and a document
stored on the node with them, a document published on a ledger is kept so an export of it can
be imported again. An identity the account adopted, whose keys the node does not hold, is only
unbound.

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

#### Implementation of

`IAuthenticationAccountComponent.removeIdentity`

***

### leaveOrganization() {#leaveorganization}

> **leaveOrganization**(`organization`): `Promise`\<`void`\>

Leave an organization with the signed in account, removing the organization and the membership
credentials it issued, which are revoked when they can be and the node signs for the
organization. The org admin role of the organization is removed, and requests to join are kept.
The last org admin cannot leave, as an organization needs one.

#### Parameters

##### organization

`string`

The DID of the organization.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the account has left.

#### Throws

NotFoundError when the account is not in the organization.

#### Throws

ConflictError when the account is the last org admin of the organization.

#### Implementation of

`IAuthenticationAccountComponent.leaveOrganization`

***

### exportProfile() {#exportprofile}

> **exportProfile**(): `Promise`\<`IAccountProfileExport`\>

Export the account data of the signed in account, other than its identity, organizations,
credentials and node migration records, in the order the items were created.

#### Returns

`Promise`\<`IAccountProfileExport`\>

The export.

#### Throws

TooManyRequestsError when the account exports too often.

#### Implementation of

`IAuthenticationAccountComponent.exportProfile`

***

### importProfile() {#importprofile}

> **importProfile**(`profile`): `Promise`\<`IAccountProfileImportResult`\>

Replace the account data of the signed in account with an export. The existing items of the
types an export may hold are removed once the items of the export have been created, keeping
the first default of each type and the order of the items. The types of which the account
holds an item owned by an authentication provider are left as they are.

#### Parameters

##### profile

`IAccountProfileExport`

The export.

#### Returns

`Promise`\<`IAccountProfileImportResult`\>

What was imported and removed.

#### Throws

UnprocessableError when the export is not valid, too large, or holds a type that moves
with the identity.

#### Throws

TooManyRequestsError when the account imports too often.

#### Implementation of

`IAuthenticationAccountComponent.importProfile`

***

### exportAccountProfile() {#exportaccountprofile}

> **exportAccountProfile**(`accountId`): `Promise`\<`IAccountProfileExport`\>

Export the account data of an account, for the account admin service, which checks the caller
first. See exportProfile for what is exported.

#### Parameters

##### accountId

`string`

The account.

#### Returns

`Promise`\<`IAccountProfileExport`\>

The export.

***

### importAccountProfile() {#importaccountprofile}

> **importAccountProfile**(`accountId`, `profile`): `Promise`\<`IAccountProfileImportResult`\>

Replace the account data of an account with an export, for the account itself and the account
admin service, which check the caller first. See importProfile for what is replaced.

#### Parameters

##### accountId

`string`

The account.

##### profile

`IAccountProfileExport`

The export.

#### Returns

`Promise`\<`IAccountProfileImportResult`\>

What was imported and removed.

#### Throws

UnprocessableError when the export is not valid, too large, or holds a type that moves
with the identity.

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

#### Throws

NotFoundError when the organization is not registered.

#### Implementation of

`IAuthenticationAccountComponent.joinOrganization`

***

### cancelOrganizationRequest() {#cancelorganizationrequest}

> **cancelOrganizationRequest**(`organization`): `Promise`\<`void`\>

Cancel the pending request of the signed in account to join an organization. The request is
removed, as when the identity is removed, so the requests answered before are kept and the
latest of them is the status again.

#### Parameters

##### organization

`string`

The DID of the organization whose request is cancelled.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the request has been cancelled.

#### Throws

NotFoundError when no request to the organization is pending.

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

### createOrganization() {#createorganization}

> **createOrganization**(`details`): `Promise`\<`IOrganization`\>

Create an organization with a DID the node holds for the signed in account, which becomes its
member, with a membership credential issued by the organization, and its org admin. An
organization identity export may be given, imported controlled by the node instead of creating
a DID, so an organization moved from another node keeps its DID. Everything created is removed
again when a step fails.

#### Parameters

##### details

`IAccountOrganizationCreate`

The profile, logo and public data of the organization, and an identity export.

#### Returns

`Promise`\<`IOrganization`\>

The organization.

#### Throws

UnprocessableError when the account has no identity, or the details or identity export
are not valid.

#### Throws

ConflictError when the account has an organization or a request to join one pending, or
the imported DID is registered, in use or already held by the node.

#### Throws

TooManyRequestsError when the account imports too often.

#### Throws

GeneralError when creating the organization fails.

#### Implementation of

`IAuthenticationAccountComponent.createOrganization`

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

#### Implementation of

`IAuthenticationAccountComponent.getPublicDataByIdentity`

***

### getPublicDataByAccount() {#getpublicdatabyaccount}

> **getPublicDataByAccount**(`accountId`): `Promise`\<`IJsonLdNodeObject`[]\>

Get the public data of an account or organization, for a signed in account.

#### Parameters

##### accountId

`string`

The account id, or the unique identifier or DID of an organization.

#### Returns

`Promise`\<`IJsonLdNodeObject`[]\>

The public JSON-LD objects, empty when nothing is public.

#### Throws

NotFoundError when nothing is stored for it.

#### Implementation of

`IAuthenticationAccountComponent.getPublicDataByAccount`

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

#### Implementation of

`IAuthenticationAccountComponent.getOrganization`

***

### create() {#create}

> **create**(`type`, `data`, `isDefault?`): `Promise`\<`string`\>

Store an item for the signed in account. An avatar replaces the avatar of the account, which
stays the default.

#### Parameters

##### type

`string`

The type of the item, not a reserved type, stored in kebab case.

##### data

`unknown`

The value of the item.

##### isDefault?

`boolean`

True to use the item first for its type, clearing any other default.

#### Returns

`Promise`\<`string`\>

The unique identifier of the item.

#### Throws

ForbiddenError when the type is reserved, or is a profile owned by the authentication provider.

#### Throws

UnprocessableError when the account holds the most items it may, in all or of the type,
or the value is not valid for the type, such as an avatar that is not a small JPEG.

#### Throws

ConflictError when the account holds an item of the type that only admins may change.

#### Implementation of

`IAuthenticationAccountComponent.create`

***

### get() {#get}

> **get**(`id`): `Promise`\<`IAuthenticationAccountData`\<`unknown`\>\>

Get an item of the signed in account.

#### Parameters

##### id

`string`

The unique identifier of the item.

#### Returns

`Promise`\<`IAuthenticationAccountData`\<`unknown`\>\>

The item.

#### Throws

NotFoundError when the item does not exist, belongs to another account, is a node
migration record or only admins may see it.

#### Implementation of

`IAuthenticationAccountComponent.get`

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

NotFoundError when the item does not exist, belongs to another account or only admins
may see it.

#### Throws

ForbiddenError when the item is of a reserved type, or is read only, or is made the
default profile in place of one owned by the authentication provider.

#### Throws

UnprocessableError when the value is not valid for the type.

#### Implementation of

`IAuthenticationAccountComponent.update`

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

NotFoundError when the item does not exist, belongs to another account or only admins
may see it.

#### Throws

ForbiddenError when the item is of a reserved type, or is read only.

#### Implementation of

`IAuthenticationAccountComponent.remove`

***

### query() {#query}

> **query**(`type?`, `cursor?`, `limit?`): `Promise`\<\{ `entities`: `IAuthenticationAccountData`\<`unknown`\>[]; `cursor?`: `string`; \}\>

Query the items of the signed in account, other than the node migration records and the items
only admins may see.

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
