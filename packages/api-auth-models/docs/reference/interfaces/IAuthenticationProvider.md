# Interface: IAuthenticationProvider\<T\>

Contract for a provider that verifies credentials, registered under its authentication provider id.

## Extends

- `IComponent`

## Type Parameters

### T {#t}

`T` = `unknown`

## Methods

### authenticate() {#authenticate}

> **authenticate**(`credentials`): `Promise`\<[`IAuthenticationProviderIdentity`](IAuthenticationProviderIdentity.md)\>

Verify the credentials and return the identity they belong to.

#### Parameters

##### credentials

`T`

The provider specific credentials.

#### Returns

`Promise`\<[`IAuthenticationProviderIdentity`](IAuthenticationProviderIdentity.md)\>

The verified identity.

#### Throws

UnauthorizedError when the credentials are not valid.

***

### getCapabilities() {#getcapabilities}

> **getCapabilities**(`providerTenantId?`): [`IAuthenticationProviderCapabilities`](IAuthenticationProviderCapabilities.md)

Get what the provider supports, so a client knows how to present it.

#### Parameters

##### providerTenantId?

`string`

The tenant of an account, for its own addresses where they differ.

#### Returns

[`IAuthenticationProviderCapabilities`](IAuthenticationProviderCapabilities.md)

The provider capabilities.
