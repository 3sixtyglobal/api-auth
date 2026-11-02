# Class: EntityStorageOrganizationService

Manages the organizations registered on the node using entity storage, their profiles, logos and
public data are held as account data owned by the organization DID. Callers holding escalated
privilege manage every organization of the tenant, the org admins of an organization manage it,
and callers holding the member admin role also create, list, export and remove the organizations
they are an org admin of.

## Implements

- `IOrganizationComponent`

## Constructors

### Constructor

> **new EntityStorageOrganizationService**(`options?`): `EntityStorageOrganizationService`

Create a new instance of EntityStorageOrganizationService.

#### Parameters

##### options?

[`IEntityStorageOrganizationServiceConstructorOptions`](../interfaces/IEntityStorageOrganizationServiceConstructorOptions.md)

The options for the service.

#### Returns

`EntityStorageOrganizationService`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

***

### DEFAULT\_MEMBER\_ADMIN\_ROLE {#default_member_admin_role}

> `readonly` `static` **DEFAULT\_MEMBER\_ADMIN\_ROLE**: `string` = `"user-admin"`

The default role whose holders manage every organization of the tenant.

***

### DEFAULT\_ESCALATED\_PRIVILEGE\_ROLE {#default_escalated_privilege_role}

> `readonly` `static` **DEFAULT\_ESCALATED\_PRIVILEGE\_ROLE**: `string` = `"global-admin"`

The default role that grants escalated privilege.

***

### DEFAULT\_AUTHORIZATION\_MODEL\_ID {#default_authorization_model_id}

> `readonly` `static` **DEFAULT\_AUTHORIZATION\_MODEL\_ID**: `string` = `"system"`

The default authorization model ID used to look up and give roles.

***

### RATE\_ACTION\_EXPORT\_IDENTITY {#rate_action_export_identity}

> `readonly` `static` **RATE\_ACTION\_EXPORT\_IDENTITY**: `string` = `"export-organization-identity"`

The rate limit action for exporting the identity of an organization.

***

### REASON\_ORGANIZATION\_REMOVED {#reason_organization_removed}

> `readonly` `static` **REASON\_ORGANIZATION\_REMOVED**: `string` = `"organizationRequest.reason.organizationRemoved"`

The i18n key of the reason given for the pending requests to join an organization that is
removed, for the client to translate.

***

### RATE\_ACTION\_IMPORT\_IDENTITY {#rate_action_import_identity}

> `readonly` `static` **RATE\_ACTION\_IMPORT\_IDENTITY**: `string` = `"import-organization-identity"`

The rate limit action for creating an organization from an identity export.

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

`IOrganizationComponent.start`

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

`IOrganizationComponent.stop`

***

### create() {#create}

> **create**(`organization`): `Promise`\<`IOrganization`\>

Create an organization, only admins may. A node controlled DID with the trust verification
method is created when no DID is given, an existing DID needs a proof by it unless the call is
a system call. The signed in caller is the first member and its org admin, the organization
becomes its default when it has none. A system call, such as from the node CLI, has no account so the
organization is created without members, firstMemberAccountId is ignored. An identity export
may be given instead, it is imported controlled by the node and removed again when the
organization can not be registered.

#### Parameters

##### organization

`IOrganizationCreate`

The details of the organization.

#### Returns

`Promise`\<`IOrganization`\>

The organization.

#### Throws

ForbiddenError when the caller is not an admin.

#### Throws

ConflictError when the DID is already registered or held by an account or the node.

#### Throws

UnauthorizedError when a required proof does not verify.

#### Throws

UnprocessableError when an identity export is given with an identity or proof, or is
not valid, or the profile, logo or public data is not valid.

#### Throws

TooManyRequestsError when the caller imports too often.

#### Implementation of

`IOrganizationComponent.create`

***

### get() {#get}

> **get**(`id`): `Promise`\<`IOrganization`\>

Get an organization, its members, org admins and admins get the profile, logo and public data
paths, others the public data.

#### Parameters

##### id

`string`

The unique identifier or the DID of the organization.

#### Returns

`Promise`\<`IOrganization`\>

The organization.

#### Throws

NotFoundError when the organization is not registered.

#### Implementation of

`IOrganizationComponent.get`

***

### query() {#query}

> **query**(`cursor?`, `limit?`): `Promise`\<\{ `entities`: `IOrganization`[]; `cursor?`: `string`; \}\>

Query the organizations, the earliest first, only admins may, an admin without escalated
privilege gets the organizations it is an org admin of.

#### Parameters

##### cursor?

`string`

The cursor to request the next page.

##### limit?

`number`

The maximum number of organizations to return.

#### Returns

`Promise`\<\{ `entities`: `IOrganization`[]; `cursor?`: `string`; \}\>

The organizations, without their profiles, and a cursor when there are more.

#### Throws

ForbiddenError when the caller is not an admin.

#### Implementation of

`IOrganizationComponent.query`

***

### search() {#search}

> **search**(`name`, `limit?`): `Promise`\<\{ `entities`: `IOrganization`[]; \}\>

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

`Promise`\<\{ `entities`: `IOrganization`[]; \}\>

The organizations with their public data, which always includes their names.

#### Implementation of

`IOrganizationComponent.search`

***

### update() {#update}

> **update**(`id`, `changes`): `Promise`\<`void`\>

Change the profile, logo and public data of an organization, those omitted are unchanged, its
org admins and callers holding escalated privilege may.

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

#### Throws

NotFoundError when the organization is not registered.

#### Throws

ForbiddenError when the caller does not manage the organization.

#### Throws

UnprocessableError when the profile, logo or public data is not valid.

#### Implementation of

`IOrganizationComponent.update`

***

### queryMembers() {#querymembers}

> **queryMembers**(`id`, `cursor?`, `limit?`): `Promise`\<\{ `entities`: `IOrganizationMember`[]; `cursor?`: `string`; \}\>

Query the members of an organization, its members, org admins and callers holding escalated
privilege may.

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

#### Throws

NotFoundError when the organization is not registered.

#### Throws

ForbiddenError when the caller is not a member and does not manage the organization.

#### Implementation of

`IOrganizationComponent.queryMembers`

***

### addAdmin() {#addadmin}

> **addAdmin**(`id`, `accountId`): `Promise`\<`void`\>

Make a member an org admin of an organization, its org admins and callers holding escalated
privilege may.

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

#### Throws

NotFoundError when the organization is not registered or the account is not a member.

#### Throws

ForbiddenError when the caller does not manage the organization.

#### Implementation of

`IOrganizationComponent.addAdmin`

***

### removeAdmin() {#removeadmin}

> **removeAdmin**(`id`, `accountId`): `Promise`\<`void`\>

Stop a member being an org admin of an organization, its org admins and callers holding
escalated privilege may, only callers holding escalated privilege may remove the last org admin.

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

#### Throws

NotFoundError when the organization is not registered or the account is neither a
member nor an org admin.

#### Throws

ForbiddenError when the caller does not manage the organization.

#### Throws

ConflictError when the account is the last org admin and the caller does not hold
escalated privilege.

#### Implementation of

`IOrganizationComponent.removeAdmin`

***

### exportIdentity() {#exportidentity}

> **exportIdentity**(`id`, `sessionStart?`): `Promise`\<`IOrganizationIdentityExport`\>

Export the identity of an organization with its private keys, only admins may, and only for an
organization whose keys the node holds, such as one it created or imported. The DID of the node
and of the organization of the tenant are never exported.

#### Parameters

##### id

`string`

The unique identifier or the DID of the organization.

##### sessionStart?

`number`

When the session of the caller started in seconds, it must be recent.

#### Returns

`Promise`\<`IOrganizationIdentityExport`\>

The export with the revocation index the organization reached, which contains private
keys and must be protected.

#### Throws

ForbiddenError when the caller is not an admin of the organization, or the organization
is the node or the organization of the tenant.

#### Throws

UnauthorizedError when the session did not start recently.

#### Throws

NotFoundError when the organization is not registered.

#### Throws

UnprocessableError when the node does not hold the keys of the organization.

#### Throws

TooManyRequestsError when the caller exports too often.

#### Implementation of

`IOrganizationComponent.exportIdentity`

***

### remove() {#remove}

> **remove**(`id`): `Promise`\<`void`\>

Remove an organization with its account data and org admin roles. Callers holding escalated
privilege and its org admins may remove it when no account is a member, and the pending
requests to join it are rejected, with the reason organizationRequest.reason.organizationRemoved.
An org admin who is its only member may also remove it, which ends their membership, revoking
its credential, and removes the pending requests to join it. The keys of a DID the node created
or imported for the organization are removed with it, a DID registered as an existing identity
is left, as the node does not hold it.

#### Parameters

##### id

`string`

The unique identifier or the DID of the organization.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the organization has been removed.

#### Throws

NotFoundError when the organization is not registered.

#### Throws

ForbiddenError when the caller does not manage the organization.

#### Throws

ConflictError when another account is a member of the organization.

#### Throws

GeneralError when removing the keys of the organization fails, the organization is kept.

#### Implementation of

`IOrganizationComponent.remove`
