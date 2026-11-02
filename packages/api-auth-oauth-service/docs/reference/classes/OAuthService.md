# Class: OAuthService

Runs the OAuth sign in flow for the providers registered with the authentication provider factory.

## Implements

- `IOAuthComponent`

## Constructors

### Constructor

> **new OAuthService**(`options`): `OAuthService`

Create a new instance of OAuthService.

#### Parameters

##### options

[`IOAuthServiceConstructorOptions`](../interfaces/IOAuthServiceConstructorOptions.md)

The options for the service.

#### Returns

`OAuthService`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

***

### ERROR\_PROVIDER\_DISABLED {#error_provider_disabled}

> `readonly` `static` **ERROR\_PROVIDER\_DISABLED**: `string` = `"providerDisabled"`

The reason given when the provider is not registered or does not use OAuth.

***

### ERROR\_CANCELLED {#error_cancelled}

> `readonly` `static` **ERROR\_CANCELLED**: `string` = `"oauthCancelled"`

The reason given when the person cancelled the sign in at the provider.

***

### ERROR\_FAILED {#error_failed}

> `readonly` `static` **ERROR\_FAILED**: `string` = `"oauthFailed"`

The reason given when the sign in failed for any other reason.

***

### DEFAULT\_TRANSACTION\_SIGNING\_KEY\_NAME {#default_transaction_signing_key_name}

> `readonly` `static` **DEFAULT\_TRANSACTION\_SIGNING\_KEY\_NAME**: `string` = `"auth-oauth-transaction"`

The default name of the vault key that signs the transaction, kept apart from the key that
signs session tokens.

## Methods

### className() {#classname}

> **className**(): `string`

Returns the class name of the component.

#### Returns

`string`

The class name of the component.

#### Implementation of

`IOAuthComponent.className`

***

### beginSignIn() {#beginsignin}

> **beginSignIn**(`authProviderId`, `callbackUrl`): `Promise`\<\{ `location`: `string`; `transaction`: `string`; \}\>

Start a sign in with a provider.

#### Parameters

##### authProviderId

`string`

The authentication provider id.

##### callbackUrl

`string`

The address the provider sends the browser back to.

#### Returns

`Promise`\<\{ `location`: `string`; `transaction`: `string`; \}\>

The address to send the browser to, and the transaction to keep until the callback.

#### Throws

NotFoundError when the provider is not registered or does not use OAuth.

#### Implementation of

`IOAuthComponent.beginSignIn`

***

### completeSignIn() {#completesignin}

> **completeSignIn**(`authProviderId`, `callbackUrl`, `callback`, `transaction?`): `Promise`\<\{ `location`: `string`; `login?`: `ILoginResult`; \}\>

Complete a sign in when the provider sends the browser back.

#### Parameters

##### authProviderId

`string`

The authentication provider id.

##### callbackUrl

`string`

The address the provider sent the browser back to.

##### callback

`IOAuthCallback`

The query parameters from the provider.

##### transaction?

`string`

The transaction kept since the sign in started.

#### Returns

`Promise`\<\{ `location`: `string`; `login?`: `ILoginResult`; \}\>

The address to send the browser to, and the login with its profile when the sign in succeeded.

#### Implementation of

`IOAuthComponent.completeSignIn`
