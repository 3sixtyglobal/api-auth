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

`IAuthenticationUser` & `object`

The user to create.

#### Returns

`Promise`\<`void`\>

Nothing.

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

Nothing.

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

Nothing.

#### Implementation of

`IAuthenticationAdminComponent.updatePassword`

***

### getEndpointWithPrefix() {#getendpointwithprefix}

> **getEndpointWithPrefix**(): `string`

Get the endpoint with the prefix for the namespace.

#### Returns

`string`

The endpoint with namespace prefix attached.

#### Inherited from

`BaseRestClient.getEndpointWithPrefix`

***

### getPathPrefix() {#getpathprefix}

> **getPathPrefix**(): `string`

Get the path prefix as a URL path string provided in the constructor.

#### Returns

`string`

The path prefix.

#### Inherited from

`BaseRestClient.getPathPrefix`

***

### fetch() {#fetch}

> **fetch**\<`T`, `U`\>(`route`, `method`, `request?`, `options?`): `Promise`\<`U`\>

Perform a request in json format.

#### Type Parameters

##### T

`T` *extends* `IHttpRequest`\<`any`\>

##### U

`U` *extends* `IHttpResponse`\<`any`\>

#### Parameters

##### route

`string`

The route of the request.

##### method

`HttpMethod`

The http method.

##### request?

`T`

Request to send to the endpoint.

##### options?

Optional override options for the request.

###### overridePrefix?

`string`

Optional override prefix to use for this request instead of the default prefix.

#### Returns

`Promise`\<`U`\>

The response.

#### Inherited from

`BaseRestClient.fetch`
