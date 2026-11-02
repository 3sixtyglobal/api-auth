# Class: EntityStorageAuthenticationAdminRestClient

The client to connect to the authentication admin service.

## Extends

- `BaseRestClient`

## Implements

- `IAuthenticationAdminComponent`

## Constructors

### Constructor

> **new EntityStorageAuthenticationAdminRestClient**(`config`): `EntityStorageAuthenticationAdminRestClient`

Create a new instance of EntityStorageAuthenticationAdminRestClient.

#### Parameters

##### config

`IBaseRestClientConfig`

The configuration for the client.

#### Returns

`EntityStorageAuthenticationAdminRestClient`

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

`IAuthenticationAdminComponent.className`

***

### create() {#create}

> **create**(`user`): `Promise`\<`void`\>

Create a login for the user.

#### Parameters

##### user

`IAuthenticationUserCreate`

The user to create.

#### Returns

`Promise`\<`void`\>

Nothing.

#### Implementation of

`IAuthenticationAdminComponent.create`

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

Get the user whose identity is the DID.

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

Update the identity or organization of a user.

#### Parameters

##### user

`Partial`\<`IAuthenticationUser`\>

The user to update, found by email address or account id.

#### Returns

`Promise`\<`void`\>

Nothing.

#### Implementation of

`IAuthenticationAdminComponent.update`

***

### remove() {#remove}

> **remove**(`email`): `Promise`\<`void`\>

Remove a user.

#### Parameters

##### email

`string`

The email address of the user to remove.

#### Returns

`Promise`\<`void`\>

Nothing.

#### Implementation of

`IAuthenticationAdminComponent.remove`

***

### updatePassword() {#updatepassword}

> **updatePassword**(`email`, `newPassword`): `Promise`\<`void`\>

Set the user's password as an override, without its current password.

#### Parameters

##### email

`string`

The email address of the user to update.

##### newPassword

`string`

The new password for the user.

#### Returns

`Promise`\<`void`\>

Nothing.

#### Implementation of

`IAuthenticationAdminComponent.updatePassword`

***

### query() {#query}

> **query**(`email?`, `exactEmail?`, `authProviderId?`, `cursor?`, `limit?`): `Promise`\<\{ `entities`: `IAuthenticationUser`[]; `cursor?`: `string`; \}\>

Query the users.

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

Disable a user so it cannot sign in.

#### Parameters

##### email

`string`

The email address of the user to disable, or the account id.

#### Returns

`Promise`\<`void`\>

Nothing.

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

Nothing.

#### Implementation of

`IAuthenticationAdminComponent.enable`
