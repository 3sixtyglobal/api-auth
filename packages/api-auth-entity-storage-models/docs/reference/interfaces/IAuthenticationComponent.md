# Interface: IAuthenticationComponent

Contract definition for authentication component.

## Extends

- `IComponent`

## Methods

### login() {#login}

> **login**(`email`, `password`): `Promise`\<[`ILoginResult`](ILoginResult.md)\>

Perform a login for the user.

#### Parameters

##### email

`string`

The email address for the user.

##### password

`string`

The password for the user.

#### Returns

`Promise`\<[`ILoginResult`](ILoginResult.md)\>

The token, and the profile when the provider holds one.

***

### loginWithProvider() {#loginwithprovider}

> **loginWithProvider**(`authProviderId`, `credentials`): `Promise`\<[`ILoginResult`](ILoginResult.md)\>

Perform a login through an authentication provider, creating the account on the first login.

#### Parameters

##### authProviderId

`string`

The authentication provider id, as registered with the authentication provider factory.

##### credentials

`unknown`

The provider specific credentials.

#### Returns

`Promise`\<[`ILoginResult`](ILoginResult.md)\>

The token, and the profile when the provider holds one.

***

### register() {#register}

> **register**(`registration`): `Promise`\<`void`\>

Sign up for a password account, when the password authentication provider is registered. A
verification link is sent by e-mail, and the account can sign in once it has been verified.

#### Parameters

##### registration

[`IAuthenticationRegistration`](IAuthenticationRegistration.md)

The details of the account.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the sign up has been accepted.

***

### verifyRegistration() {#verifyregistration}

> **verifyRegistration**(`token`): `Promise`\<`void`\>

Verify the e-mail address of a self sign up with the token from the verification link.

#### Parameters

##### token

`string`

The token from the verification link.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the account has been verified.

***

### me() {#me}

> **me**(): `Promise`\<[`IAuthenticationAccountSummary`](IAuthenticationAccountSummary.md)\>

Get the signed in account.

#### Returns

`Promise`\<[`IAuthenticationAccountSummary`](IAuthenticationAccountSummary.md)\>

The account details.

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

A promise that resolves when the logout has been completed.

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

***

### updatePassword() {#updatepassword}

> **updatePassword**(`currentPassword`, `newPassword`, `token?`, `sessionStart?`): `Promise`\<\{ `token?`: `string`; `expiry`: `number`; \}\>

Update the user's password, ending the other sessions of the account. The current session
continues with a new token that keeps its session start.

#### Parameters

##### currentPassword

`string`

The current password for the user.

##### newPassword

`string`

The new password for the user.

##### token?

`string`

The token of the current session, if it uses a mechanism with public access.

##### sessionStart?

`number`

When the current session started in seconds, read from the token when omitted.

#### Returns

`Promise`\<\{ `token?`: `string`; `expiry`: `number`; \}\>

The new token for the current session, if it uses a mechanism with public access.

***

### forgotPassword() {#forgotpassword}

> **forgotPassword**(`email`): `Promise`\<`void`\>

Send a link to reset a forgotten password to the e-mail address, when a password account uses it.
Completes the same way whether or not the account exists.

#### Parameters

##### email

`string`

The e-mail address of the account.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the request has been handled.

***

### resetPassword() {#resetpassword}

> **resetPassword**(`token`, `newPassword`): `Promise`\<`void`\>

Reset a forgotten password with the token from the reset link, ending every session of the account.

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

***

### removeAccount() {#removeaccount}

> **removeAccount**(`sessionStart?`): `Promise`\<`void`\>

Remove the signed in account and the data stored for it, with its identity and the keys the
node holds for it, the session must have started recently.

#### Parameters

##### sessionStart?

`number`

When the current session started in seconds.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the account has been removed.

***

### passwordPolicy() {#passwordpolicy}

> **passwordPolicy**(): `Promise`\<[`IPasswordOptions`](IPasswordOptions.md)\>

Get the password policy used for password validation.

#### Returns

`Promise`\<[`IPasswordOptions`](IPasswordOptions.md)\>

The password policy options.

***

### providers() {#providers}

> **providers**(): `Promise`\<`IAuthenticationProviderDetails`[]\>

Get the authentication providers enabled on the server.

#### Returns

`Promise`\<`IAuthenticationProviderDetails`[]\>

The providers and what each supports, in the order they were registered.
