# Class: EntityStorageAuthenticationRestClient

The client to connect to the authentication service.

## Extends

- `BaseRestClient`

## Implements

- `IAuthenticationComponent`

## Constructors

### Constructor

> **new EntityStorageAuthenticationRestClient**(`config`): `EntityStorageAuthenticationRestClient`

Create a new instance of EntityStorageAuthenticationRestClient.

#### Parameters

##### config

[`IEntityStorageAuthenticationRestClientConstructorOptions`](../interfaces/IEntityStorageAuthenticationRestClientConstructorOptions.md)

The configuration for the client.

#### Returns

`EntityStorageAuthenticationRestClient`

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

`IAuthenticationComponent.className`

***

### login() {#login}

> **login**(`email`, `password`): `Promise`\<`ILoginResult`\>

Perform a login for the user.

#### Parameters

##### email

`string`

The email address for the user.

##### password

`string`

The password for the user.

#### Returns

`Promise`\<`ILoginResult`\>

The token, and the profile when the provider holds one.

#### Implementation of

`IAuthenticationComponent.login`

***

### loginWithProvider() {#loginwithprovider}

> **loginWithProvider**(`authProviderId`, `credentials`): `Promise`\<`ILoginResult`\>

Perform a login through an authentication provider, creating the account on the first login.

#### Parameters

##### authProviderId

`string`

The authentication provider id.

##### credentials

`unknown`

The provider specific credentials.

#### Returns

`Promise`\<`ILoginResult`\>

The token, and the profile when the provider holds one.

#### Implementation of

`IAuthenticationComponent.loginWithProvider`

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

A promise that resolves when the logout request has completed.

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

> **updatePassword**(`currentPassword`, `newPassword`): `Promise`\<\{ `token?`: `string`; `expiry`: `number`; \}\>

Update the user's password, ending the other sessions of the account.

#### Parameters

##### currentPassword

`string`

The current password for the user.

##### newPassword

`string`

The new password for the user.

#### Returns

`Promise`\<\{ `token?`: `string`; `expiry`: `number`; \}\>

The new token for the current session.

#### Implementation of

`IAuthenticationComponent.updatePassword`

***

### forgotPassword() {#forgotpassword}

> **forgotPassword**(`email`): `Promise`\<`void`\>

Send a link to reset a forgotten password to the e-mail address, when a password account uses it.

#### Parameters

##### email

`string`

The e-mail address of the account.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the request has been handled.

#### Implementation of

`IAuthenticationComponent.forgotPassword`

***

### resetPassword() {#resetpassword}

> **resetPassword**(`token`, `newPassword`): `Promise`\<`void`\>

Reset a forgotten password with the token from the reset link.

#### Parameters

##### token

`string`

The token from the reset link.

##### newPassword

`string`

The new password for the account.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the password has been reset.

#### Implementation of

`IAuthenticationComponent.resetPassword`

***

### removeAccount() {#removeaccount}

> **removeAccount**(): `Promise`\<`void`\>

Remove the signed in account and the data stored for it.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the account has been removed.

#### Implementation of

`IAuthenticationComponent.removeAccount`

***

### passwordPolicy() {#passwordpolicy}

> **passwordPolicy**(): `Promise`\<`IPasswordOptions`\>

Get the password policy used for password validation.

#### Returns

`Promise`\<`IPasswordOptions`\>

The password policy options.

#### Implementation of

`IAuthenticationComponent.passwordPolicy`

***

### providers() {#providers}

> **providers**(): `Promise`\<`IAuthenticationProviderDetails`[]\>

Get the authentication providers enabled on the server.

#### Returns

`Promise`\<`IAuthenticationProviderDetails`[]\>

The providers and what each supports, in the order they were registered.

#### Implementation of

`IAuthenticationComponent.providers`

***

### register() {#register}

> **register**(`registration`): `Promise`\<`void`\>

Sign up for a password account. A verification link is sent by e-mail, and the account can
sign in once it has been verified.

#### Parameters

##### registration

`IAuthenticationRegistration`

The details of the account.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the sign up has been accepted.

#### Implementation of

`IAuthenticationComponent.register`

***

### verifyRegistration() {#verifyregistration}

> **verifyRegistration**(`token`): `Promise`\<`void`\>

Verify the e-mail address of a sign up with the token from the verification link.

#### Parameters

##### token

`string`

The token from the verification link.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the account has been verified.

#### Implementation of

`IAuthenticationComponent.verifyRegistration`

***

### me() {#me}

> **me**(): `Promise`\<`IAuthenticationAccountSummary`\>

Get the signed in account.

#### Returns

`Promise`\<`IAuthenticationAccountSummary`\>

The account details.

#### Implementation of

`IAuthenticationComponent.me`
