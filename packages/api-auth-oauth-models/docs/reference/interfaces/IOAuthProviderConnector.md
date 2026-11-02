# Interface: IOAuthProviderConnector

Contract for an authentication provider that signs accounts in through OAuth.

## Extends

- `IAuthenticationProvider`\<[`IOAuthCodeExchange`](IOAuthCodeExchange.md)\>

## Methods

### authenticate() {#authenticate}

> **authenticate**(`credentials`): `Promise`\<`IAuthenticationProviderIdentity`\>

Verify the credentials and return the identity they belong to.

#### Parameters

##### credentials

[`IOAuthCodeExchange`](IOAuthCodeExchange.md)

The provider specific credentials.

#### Returns

`Promise`\<`IAuthenticationProviderIdentity`\>

The verified identity.

#### Throws

UnauthorizedError when the credentials are not valid.

#### Inherited from

`IAuthenticationProvider.authenticate`

***

### getCapabilities() {#getcapabilities}

> **getCapabilities**(`providerTenantId?`): `IAuthenticationProviderCapabilities`

Get what the provider supports, so a client knows how to present it.

#### Parameters

##### providerTenantId?

`string`

The tenant of an account, for its own addresses where they differ.

#### Returns

`IAuthenticationProviderCapabilities`

The provider capabilities.

#### Inherited from

`IAuthenticationProvider.getCapabilities`

***

### authorizationUrl() {#authorizationurl}

> **authorizationUrl**(`request`): `string`

Build the address that sends the browser to the provider to sign in.

#### Parameters

##### request

[`IOAuthAuthorizationRequest`](IOAuthAuthorizationRequest.md)

The values for the authorization request.

#### Returns

`string`

The authorization address.
