# Interface: IOAuthComponent

Contract for the component that runs the OAuth sign in flow.

## Extends

- `IComponent`

## Methods

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

[`IOAuthCallback`](IOAuthCallback.md)

The query parameters from the provider.

##### transaction?

`string`

The transaction kept since the sign in started.

#### Returns

`Promise`\<\{ `location`: `string`; `login?`: `ILoginResult`; \}\>

The address to send the browser to, and the login with its profile when the sign in succeeded.
