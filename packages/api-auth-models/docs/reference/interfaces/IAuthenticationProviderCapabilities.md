# Interface: IAuthenticationProviderCapabilities

What an authentication provider supports, so a client knows how to present it.

## Extended by

- [`IAuthenticationProviderDetails`](IAuthenticationProviderDetails.md)

## Properties

### signInMethod {#signinmethod}

> **signInMethod**: `"password"` \| `"redirect"`

How people sign in, password for an e-mail and password form, redirect to send the browser to the provider.

***

### passwordChange {#passwordchange}

> **passwordChange**: `"api"` \| `"external"`

How passwords are changed, api through the password endpoint, external with the provider.

***

### passwordChangeUrl? {#passwordchangeurl}

> `optional` **passwordChangeUrl?**: `string`

The address where the password is changed, when it is changed with the provider.

***

### profileReadOnly {#profilereadonly}

> **profileReadOnly**: `boolean`

True when the provider owns the profile, so it can only be edited with the provider.

***

### profileEditUrl? {#profileediturl}

> `optional` **profileEditUrl?**: `string`

The address where the profile can be edited, when the provider owns it.
