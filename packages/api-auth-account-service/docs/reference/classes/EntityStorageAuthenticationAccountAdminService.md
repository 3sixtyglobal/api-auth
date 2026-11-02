# Class: EntityStorageAuthenticationAccountAdminService

Manages the data of the accounts of the tenant using entity storage. Callers holding escalated
privilege manage every account, other callers only the members of the organizations they are an
org admin of, other accounts are reported as missing. Accounts holding escalated privilege, and
the identity and organization of the caller's own account, are only changed by callers holding
escalated privilege.

## Implements

- `IAuthenticationAccountAdminComponent`

## Constructors

### Constructor

> **new EntityStorageAuthenticationAccountAdminService**(`options?`): `EntityStorageAuthenticationAccountAdminService`

Create a new instance of EntityStorageAuthenticationAccountAdminService.

#### Parameters

##### options?

[`IEntityStorageAuthenticationAccountAdminServiceConstructorOptions`](../interfaces/IEntityStorageAuthenticationAccountAdminServiceConstructorOptions.md)

The options for the service.

#### Returns

`EntityStorageAuthenticationAccountAdminService`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

***

### DEFAULT\_ESCALATED\_PRIVILEGE\_ROLE {#default_escalated_privilege_role}

> `readonly` `static` **DEFAULT\_ESCALATED\_PRIVILEGE\_ROLE**: `string` = `"global-admin"`

The default role that grants escalated privilege.

***

### DEFAULT\_AUTHORIZATION\_MODEL\_ID {#default_authorization_model_id}

> `readonly` `static` **DEFAULT\_AUTHORIZATION\_MODEL\_ID**: `string` = `"system"`

The default authorization model ID used to look up roles.

***

### DEFAULT\_ASSIGNABLE\_ROLES {#default_assignable_roles}

> `readonly` `static` **DEFAULT\_ASSIGNABLE\_ROLES**: `string`[]

The default roles a caller holding escalated privilege may always grant and revoke.

## Methods

### className() {#classname}

> **className**(): `string`

Returns the class name of the component.

#### Returns

`string`

The class name of the component.

#### Implementation of

`IAuthenticationAccountAdminComponent.className`

***

### create() {#create}

> **create**(`accountId`, `type`, `data`, `isDefault?`, `proof?`, `adminOnly?`): `Promise`\<`string`\>

Store an item for an account. An organization is stored with a membership credential, issued
when the account binds an identity if it has none yet. An avatar replaces the avatar of the
account, which stays the default.

#### Parameters

##### accountId

`string`

The account to store the item for.

##### type

`string`

The type of the item.

##### data

`unknown`

The value of the item.

##### isDefault?

`boolean`

True to use the item first for its type, clearing any other default.

##### proof?

`IProof`

A proof by the DID over the identity proof document, required when a caller
without escalated privilege stores an identity.

##### adminOnly?

`boolean`

True when only admins may see and change the item.

#### Returns

`Promise`\<`string`\>

The unique identifier of the item.

#### Throws

ConflictError when an identity is stored for an account that has one, or a DID held by
an account, the node or an organization.

#### Throws

ForbiddenError when the identity or organization of an escalated account, or of the
caller's own account, is set by a caller without escalated privilege, or an admin replaces an
avatar owned by the authentication provider.

#### Throws

UnauthorizedError when a required identity proof does not verify.

#### Throws

NotFoundError when an organization is not registered.

#### Throws

UnprocessableError when the account is a registered organization, whose profiles are
changed through the organization service, the value is not valid for the type, or the account
holds the most items of the type its verifier allows.

#### Throws

NotFoundError when the caller does not manage the account.

#### Implementation of

`IAuthenticationAccountAdminComponent.create`

***

### createIdentity() {#createidentity}

> **createIdentity**(`accountId`): `Promise`\<`string`\>

Create a self-controlled identity with keys the node holds for an account that has none, as
the account does itself.

#### Parameters

##### accountId

`string`

The account.

#### Returns

`Promise`\<`string`\>

The DID of the account.

#### Throws

UnprocessableError when the account is a registered organization.

#### Throws

NotFoundError when the account does not exist.

#### Throws

ForbiddenError when the account holds escalated privilege, or is the caller's own, and
the caller does not hold escalated privilege.

#### Throws

ConflictError when the account already has an identity.

#### Implementation of

`IAuthenticationAccountAdminComponent.createIdentity`

***

### exportIdentity() {#exportidentity}

> **exportIdentity**(`accountId`, `sessionStart?`): `Promise`\<`IAccountIdentityExport`\>

Export the identity of an account with its private keys and the credentials it holds, as the
account does itself. The caller must have signed in recently, as the keys leave the node, a
system call such as from the node CLI has no session.

#### Parameters

##### accountId

`string`

The account.

##### sessionStart?

`number`

When the session of the caller started in seconds, it must be recent.

#### Returns

`Promise`\<`IAccountIdentityExport`\>

The export, which contains private keys and must be protected.

#### Throws

ForbiddenError when the account holds escalated privilege and the caller does not.

#### Throws

UnauthorizedError when the session did not start recently.

#### Throws

NotFoundError when the account does not exist or has no identity.

#### Throws

UnprocessableError when the node does not hold the keys of the identity, or the account
is a registered organization.

#### Implementation of

`IAuthenticationAccountAdminComponent.exportIdentity`

***

### importIdentity() {#importidentity}

> **importIdentity**(`accountId`, `exported`): `Promise`\<`IAccountIdentityImportResult`\>

Import a self-controlled identity into an account that has none, as the account does itself.
The type of the file is checked before anything else.

#### Parameters

##### accountId

`string`

The account.

##### exported

`IAccountIdentityExport`

The account identity export file.

#### Returns

`Promise`\<`IAccountIdentityImportResult`\>

The DID and what was imported.

#### Throws

UnprocessableError when the file is not an account identity export or is not valid, or
the account is a registered organization.

#### Throws

NotFoundError when the account does not exist.

#### Throws

ForbiddenError when the account holds escalated privilege, or is the caller's own, and
the caller does not hold escalated privilege.

#### Throws

ConflictError when the account already has an identity, or the DID is held.

#### Implementation of

`IAuthenticationAccountAdminComponent.importIdentity`

***

### exportProfile() {#exportprofile}

> **exportProfile**(`accountId`): `Promise`\<`IAccountProfileExport`\>

Export the account data of an account, as the account does itself.

#### Parameters

##### accountId

`string`

The account.

#### Returns

`Promise`\<`IAccountProfileExport`\>

The export.

#### Throws

NotFoundError when the account does not exist.

#### Throws

ForbiddenError when the account holds escalated privilege and the caller does not.

#### Throws

UnprocessableError when the account is a registered organization.

#### Implementation of

`IAuthenticationAccountAdminComponent.exportProfile`

***

### importProfile() {#importprofile}

> **importProfile**(`accountId`, `profile`): `Promise`\<`IAccountProfileImportResult`\>

Replace the account data of an account with an export, as the account does itself. The type of
the file is checked before anything else.

#### Parameters

##### accountId

`string`

The account.

##### profile

`IAccountProfileExport`

The account profile export file.

#### Returns

`Promise`\<`IAccountProfileImportResult`\>

What was imported and removed.

#### Throws

UnprocessableError when the file is not an account profile export or is not valid, or
the account is a registered organization.

#### Throws

NotFoundError when the account does not exist.

#### Throws

ForbiddenError when the account holds escalated privilege and the caller does not.

#### Implementation of

`IAuthenticationAccountAdminComponent.importProfile`

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

#### Throws

NotFoundError when the item does not exist, or the caller does not manage its account.

#### Implementation of

`IAuthenticationAccountAdminComponent.get`

***

### update() {#update}

> **update**(`id`, `data`, `isDefault?`, `adminOnly?`): `Promise`\<`void`\>

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

##### adminOnly?

`boolean`

True when only admins may see and change the item, unchanged when omitted.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the item has been updated.

#### Throws

NotFoundError when the item does not exist, or the caller does not manage its account.

#### Throws

UnprocessableError when the DID of an identity or an organization is changed, remove
it and create another.

#### Throws

ForbiddenError when the identity or organization of an escalated account, or of the
caller's own account, is changed by a caller without escalated privilege, or an admin
changes an avatar owned by the authentication provider.

#### Implementation of

`IAuthenticationAccountAdminComponent.update`

***

### remove() {#remove}

> **remove**(`id`): `Promise`\<`void`\>

Remove an item. Removing an organization removes the account from it, revoking the membership
credential the node issued and removing the membership credentials of the organization the
account holds. Removing an identity removes it as the account would, with the keys the node
holds for it, the credentials, organizations and pending requests to join one.

#### Parameters

##### id

`string`

The unique identifier of the item.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the item has been removed.

#### Throws

NotFoundError when the item does not exist, or the caller does not manage its account.

#### Throws

ForbiddenError when the identity or organization of an escalated account, or of the
caller's own account, is removed by a caller without escalated privilege, or an admin
removes an avatar owned by the authentication provider.

#### Throws

GeneralError when the node holds the keys of an identity and removing them fails.

#### Implementation of

`IAuthenticationAccountAdminComponent.remove`

***

### query() {#query}

> **query**(`accountId?`, `type?`, `cursor?`, `limit?`): `Promise`\<\{ `entities`: `IAuthenticationAccountData`\<`unknown`\>[]; `cursor?`: `string`; \}\>

Query the items of the accounts the caller manages.

#### Parameters

##### accountId?

`string`

The account of the items to return, all accounts the caller manages when omitted.

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

`IAuthenticationAccountAdminComponent.query`

***

### getManagedAccounts() {#getmanagedaccounts}

> **getManagedAccounts**(): `Promise`\<`string`[] \| `undefined`\>

Get the accounts the caller may manage, callers without escalated privilege only manage the
members of the organizations they are an org admin of.

#### Returns

`Promise`\<`string`[] \| `undefined`\>

The account ids, or undefined when the caller may manage every account.

#### Implementation of

`IAuthenticationAccountAdminComponent.getManagedAccounts`

***

### getRoles() {#getroles}

> **getRoles**(`accountId`): `Promise`\<`string`[]\>

Get the roles of an account the caller manages.

#### Parameters

##### accountId

`string`

The account.

#### Returns

`Promise`\<`string`[]\>

The roles.

#### Throws

NotFoundError when the caller does not manage the account.

#### Implementation of

`IAuthenticationAccountAdminComponent.getRoles`

***

### getAssignableRoles() {#getassignableroles}

> **getAssignableRoles**(): `Promise`\<`string`[]\>

Get the roles the caller may grant and revoke, for a caller holding escalated privilege every
role in use, the escalated privilege role and the configured assignable roles, otherwise the roles it holds other than the escalated privilege role. The org admin
roles are never included, they are managed through the organization.

#### Returns

`Promise`\<`string`[]\>

The roles.

#### Implementation of

`IAuthenticationAccountAdminComponent.getAssignableRoles`

***

### addRole() {#addrole}

> **addRole**(`accountId`, `role`): `Promise`\<`void`\>

Grant a role to an account the caller manages, through the authorization component in the
context of the caller, so its own escalation checks also apply.

#### Parameters

##### accountId

`string`

The account.

##### role

`string`

The role.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the role has been granted.

#### Throws

NotFoundError when the caller does not manage the account.

#### Throws

ForbiddenError when the caller may not grant the role to the account.

#### Throws

UnprocessableError when the role is an org admin role.

#### Implementation of

`IAuthenticationAccountAdminComponent.addRole`

***

### removeRole() {#removerole}

> **removeRole**(`accountId`, `role`): `Promise`\<`void`\>

Revoke a role of an account the caller manages, through the authorization component in the
context of the caller, so its own escalation checks also apply.

#### Parameters

##### accountId

`string`

The account.

##### role

`string`

The role.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the role has been revoked.

#### Throws

NotFoundError when the caller does not manage the account.

#### Throws

ForbiddenError when the caller may not revoke the role of the account.

#### Throws

UnprocessableError when the role is an org admin role.

#### Throws

ConflictError when the escalated privilege role is revoked from its last holder.

#### Implementation of

`IAuthenticationAccountAdminComponent.removeRole`
