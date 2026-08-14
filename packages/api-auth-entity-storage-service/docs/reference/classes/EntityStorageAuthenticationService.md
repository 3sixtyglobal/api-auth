# Class: EntityStorageAuthenticationService

Implementation of the authentication component using entity storage.

## Implements

- `IAuthenticationComponent`

## Constructors

### Constructor

> **new EntityStorageAuthenticationService**(`options?`): `EntityStorageAuthenticationService`

Create a new instance of EntityStorageAuthentication.

#### Parameters

##### options?

[`IEntityStorageAuthenticationServiceConstructorOptions`](../interfaces/IEntityStorageAuthenticationServiceConstructorOptions.md)

The dependencies for the identity connector.

#### Returns

`EntityStorageAuthenticationService`

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

`IAuthenticationComponent.className`

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

A promise that resolves when rate-limit actions have been registered and the node identity cached.

#### Implementation of

`IAuthenticationComponent.start`

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

A promise that resolves when all rate-limit actions have been unregistered.

#### Implementation of

`IAuthenticationComponent.stop`

***

### login() {#login}

> **login**(`email`, `password`): `Promise`\<\{ `token?`: `string`; `expiry`: `number`; \}\>

Perform a login for the user.

#### Parameters

##### email

`string`

The email address for the user.

##### password

`string`

The password for the user.

#### Returns

`Promise`\<\{ `token?`: `string`; `expiry`: `number`; \}\>

The authentication token for the user, if it uses a mechanism with public access.

#### Implementation of

`IAuthenticationComponent.login`

***

### logout() {#logout}

> **logout**(`token?`): `Promise`\<`void`\>

Logout the current user.

#### Parameters

##### token?

`string`

The token to logout, if it uses a mechanism with public access.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the logout audit entry has been recorded.

#### Implementation of

`IAuthenticationComponent.logout`

***

### refresh() {#refresh}

> **refresh**(`token?`): `Promise`\<\{ `token?`: `string`; `expiry`: `number`; \}\>

Refresh the token.

#### Parameters

##### token?

`string`

The token to refresh, if it uses a mechanism with public access.

#### Returns

`Promise`\<\{ `token?`: `string`; `expiry`: `number`; \}\>

The refreshed token, if it uses a mechanism with public access.

#### Implementation of

`IAuthenticationComponent.refresh`

***

### updatePassword() {#updatepassword}

> **updatePassword**(`currentPassword`, `newPassword`): `Promise`\<`void`\>

Update the user's password.

#### Parameters

##### currentPassword

`string`

The current password for the user.

##### newPassword

`string`

The new password for the user.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the password has been updated and the rate limit cleared.

#### Implementation of

`IAuthenticationComponent.updatePassword`
