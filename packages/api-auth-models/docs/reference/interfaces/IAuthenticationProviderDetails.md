# Interface: IAuthenticationProviderDetails

An enabled authentication provider and what it supports.

## Extends

- [`IAuthenticationProviderCapabilities`](IAuthenticationProviderCapabilities.md)

## Properties

### type {#type}

> **type**: [`AuthenticationProviderType`](../type-aliases/AuthenticationProviderType.md)

The protocol the provider signs accounts in with.

#### Inherited from

[`IAuthenticationProviderCapabilities`](IAuthenticationProviderCapabilities.md).[`type`](IAuthenticationProviderCapabilities.md#type)

***

### signInMethod {#signinmethod}

> **signInMethod**: `"password"` \| `"redirect"`

How people sign in, password for an e-mail and password form, redirect to send the browser to the provider.

#### Inherited from

[`IAuthenticationProviderCapabilities`](IAuthenticationProviderCapabilities.md).[`signInMethod`](IAuthenticationProviderCapabilities.md#signinmethod)

***

### passwordChange {#passwordchange}

> **passwordChange**: `"api"` \| `"external"`

How passwords are changed, api through the password endpoint, external with the provider.

#### Inherited from

[`IAuthenticationProviderCapabilities`](IAuthenticationProviderCapabilities.md).[`passwordChange`](IAuthenticationProviderCapabilities.md#passwordchange)

***

### passwordChangeUrl? {#passwordchangeurl}

> `optional` **passwordChangeUrl?**: `string`

The address where the password is changed, when it is changed with the provider.

#### Inherited from

[`IAuthenticationProviderCapabilities`](IAuthenticationProviderCapabilities.md).[`passwordChangeUrl`](IAuthenticationProviderCapabilities.md#passwordchangeurl)

***

### profileReadOnly {#profilereadonly}

> **profileReadOnly**: `boolean`

True when the provider owns the profile, so it can only be edited with the provider.

#### Inherited from

[`IAuthenticationProviderCapabilities`](IAuthenticationProviderCapabilities.md).[`profileReadOnly`](IAuthenticationProviderCapabilities.md#profilereadonly)

***

### profileEditUrl? {#profileediturl}

> `optional` **profileEditUrl?**: `string`

The address where the profile can be edited, when the provider owns it.

#### Inherited from

[`IAuthenticationProviderCapabilities`](IAuthenticationProviderCapabilities.md).[`profileEditUrl`](IAuthenticationProviderCapabilities.md#profileediturl)

***

### authProviderId {#authproviderid}

> **authProviderId**: `string`

The authentication provider id, as registered with the authentication provider factory.
