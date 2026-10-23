# Class: EntityStorageAuthenticationAdminService

Implementation of the authentication component using entity storage.

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

Create a login for the user.

#### Parameters

##### user

`IAuthenticationUser` & `object`

The user to create.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the user account has been created and the audit entry recorded.

#### Implementation of

`IAuthenticationAdminComponent.create`

***

### update() {#update}

> **update**(`user`): `Promise`\<`void`\>

Update a login for the user.

#### Parameters

##### user

`Partial`\<`IAuthenticationUser`\>

The user to update.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the user account has been updated and the audit entry recorded.

#### Implementation of

`IAuthenticationAdminComponent.update`

***

### get() {#get}

> **get**(`email`): `Promise`\<`IAuthenticationUser`\>

Get a user by email.

#### Parameters

##### email

`string`

The email address of the user to get.

#### Returns

`Promise`\<`IAuthenticationUser`\>

The user details.

#### Implementation of

`IAuthenticationAdminComponent.get`

***

### getByIdentity() {#getbyidentity}

> **getByIdentity**(`identity`): `Promise`\<`IAuthenticationUser`\>

Get a user by identity.

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

### remove() {#remove}

> **remove**(`email`): `Promise`\<`void`\>

Remove the current user.

#### Parameters

##### email

`string`

The email address of the user to remove.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the user account has been removed and the audit entry recorded.

#### Implementation of

`IAuthenticationAdminComponent.remove`

***

### updatePassword() {#updatepassword}

> **updatePassword**(`email`, `newPassword`, `currentPassword?`): `Promise`\<`void`\>

Update the user's password.

#### Parameters

##### email

`string`

The email address of the user to update.

##### newPassword

`string`

The new password for the user.

##### currentPassword?

`string`

The current password, optional, if supplied will check against existing.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the password has been updated.

#### Implementation of

`IAuthenticationAdminComponent.updatePassword`
