# Class: EntityStorageAuthenticationAdminService

Implementation of the authentication admin component using entity storage. Callers holding the
escalated privilege role act on every account of their tenant, other callers only on the members
of the organizations they are an org admin of, other users are reported as missing. Only callers
holding the escalated privilege role may act on accounts that hold it. Calls without a caller
account, such as from the node CLI, are system calls.

## Implements

- `IAuthenticationAdminComponent`

## Constructors

### Constructor

> **new EntityStorageAuthenticationAdminService**(`options?`): `EntityStorageAuthenticationAdminService`

Create a new instance of EntityStorageAuthentication.

#### Parameters

##### options?

[`IEntityStorageAuthenticationAdminServiceConstructorOptions`](../interfaces/IEntityStorageAuthenticationAdminServiceConstructorOptions.md)

The dependencies for the identity connector.

#### Returns

`EntityStorageAuthenticationAdminService`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

***

### AUTH\_PROVIDER\_ID {#auth_provider_id}

> `readonly` `static` **AUTH\_PROVIDER\_ID**: `string` = `"3sixty"`

The provider id stored on accounts created by this service.

***

### DEFAULT\_ESCALATED\_PRIVILEGE\_ROLE {#default_escalated_privilege_role}

> `readonly` `static` **DEFAULT\_ESCALATED\_PRIVILEGE\_ROLE**: `string` = `"global-admin"`

The default role that grants escalated privilege.

***

### DEFAULT\_AUTHORIZATION\_MODEL\_ID {#default_authorization_model_id}

> `readonly` `static` **DEFAULT\_AUTHORIZATION\_MODEL\_ID**: `string` = `"system"`

The default authorization model ID used to look up roles.

## Methods

### className() {#classname}

> **className**(): `string`

Returns the class name of the component.

#### Returns

`string`

The class name of the component.

#### Implementation of

`IAuthenticationAdminComponent.className`

***

### create() {#create}

> **create**(`user`): `Promise`\<`void`\>

Create a login for the user, its e-mail address is treated as verified.
The service allocates the account id.

#### Parameters

##### user

`IAuthenticationUserCreate`

The user to create.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the user account has been created and the audit entry recorded.

#### Throws

ConflictError when a password account exists for the e-mail address.

#### Implementation of

`IAuthenticationAdminComponent.create`

***

### get() {#get}

> **get**(`email`): `Promise`\<`IAuthenticationUser`\>

Get a user of any authentication provider.

#### Parameters

##### email

`string`

The email address of the user to get, or the account id.

#### Returns

`Promise`\<`IAuthenticationUser`\>

The user details.

#### Implementation of

`IAuthenticationAdminComponent.get`

***

### getByIdentity() {#getbyidentity}

> **getByIdentity**(`identity`): `Promise`\<`IAuthenticationUser`\>

Get the user whose identity account data holds the DID.

#### Parameters

##### identity

`string`

The identity of the user to get.

#### Returns

`Promise`\<`IAuthenticationUser`\>

The user details.

#### Implementation of

`IAuthenticationAdminComponent.getByIdentity`

***

### update() {#update}

> **update**(`user`): `Promise`\<`void`\>

Update the identity or organization of a user through its account data. The organization
becomes the default organization of the account, the identity replaces any identity it has.
Callers without escalated privilege may not change an escalated account or their own account,
and must bind an identity through the account service, which takes a proof of the DID.

#### Parameters

##### user

`Partial`\<`IAuthenticationUser`\>

The user to update, found by email address or account id.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the user account has been updated.

#### Implementation of

`IAuthenticationAdminComponent.update`

***

### remove() {#remove}

> **remove**(`email`): `Promise`\<`void`\>

Remove a user of any authentication provider. The account is disabled first so its sessions
end, then the data stored for it, its roles and its requests to join an organization are
removed, when the components that hold them exist, and the account last. A caller cannot remove
itself here, it removes its own account as the signed in account, which needs a recent sign in.

#### Parameters

##### email

`string`

The email address of the user to remove, or the account id.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the user account has been removed and the audit entry recorded.

#### Throws

ForbiddenError when the caller is the user.

#### Implementation of

`IAuthenticationAdminComponent.remove`

***

### updatePassword() {#updatepassword}

> **updatePassword**(`email`, `newPassword`): `Promise`\<`void`\>

Set the user's password as an override, ending its sessions and removing its password reset
tokens. The current password is not needed. A caller cannot set its own password here, it
changes it through the authentication component with its current password instead.

#### Parameters

##### email

`string`

The email address of the user to update, or the account id.

##### newPassword

`string`

The new password for the user.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the password has been updated.

#### Throws

ForbiddenError when the caller is the user.

#### Implementation of

`IAuthenticationAdminComponent.updatePassword`

***

### query() {#query}

> **query**(`email?`, `exactEmail?`, `authProviderId?`, `cursor?`, `limit?`): `Promise`\<\{ `entities`: `IAuthenticationUser`[]; `cursor?`: `string`; \}\>

Query the users of the tenant the caller manages.

#### Parameters

##### email?

`string`

The start of the e-mail address of the users to return, all when omitted.

##### exactEmail?

`boolean`

True to match the e-mail address exactly rather than as a prefix.

##### authProviderId?

`string`

The authentication provider of the users to return, all when omitted.

##### cursor?

`string`

The cursor to request the next page.

##### limit?

`number`

The maximum number of users to return.

#### Returns

`Promise`\<\{ `entities`: `IAuthenticationUser`[]; `cursor?`: `string`; \}\>

The users and a cursor when there are more.

#### Implementation of

`IAuthenticationAdminComponent.query`

***

### disable() {#disable}

> **disable**(`email`): `Promise`\<`void`\>

Disable a user so it cannot sign in, ending its sessions and removing its password reset and
verification tokens. A caller cannot disable itself.

#### Parameters

##### email

`string`

The email address of the user to disable, or the account id.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the user has been disabled.

#### Implementation of

`IAuthenticationAdminComponent.disable`

***

### enable() {#enable}

> **enable**(`email`): `Promise`\<`void`\>

Enable a disabled user.

#### Parameters

##### email

`string`

The email address of the user to enable, or the account id.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the user has been enabled.

#### Implementation of

`IAuthenticationAdminComponent.enable`
