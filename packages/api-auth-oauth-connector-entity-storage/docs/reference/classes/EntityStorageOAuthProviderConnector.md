# Class: EntityStorageOAuthProviderConnector

Authentication provider that signs password accounts held in entity storage in through an
OAuth 2.0 authorization code flow with PKCE, the node acting as the authorization server.

## Implements

- `IOAuthProviderConnector`

## Constructors

### Constructor

> **new EntityStorageOAuthProviderConnector**(`options`): `EntityStorageOAuthProviderConnector`

Create a new instance of EntityStorageOAuthProviderConnector.

#### Parameters

##### options

[`IEntityStorageOAuthProviderConnectorConstructorOptions`](../interfaces/IEntityStorageOAuthProviderConnectorConstructorOptions.md)

The options for the connector.

#### Returns

`EntityStorageOAuthProviderConnector`

## Properties

### NAMESPACE {#namespace}

> `readonly` `static` **NAMESPACE**: `string` = `"3sixty-oauth"`

The authentication provider id to register the connector with.

***

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

***

### CODE\_CHALLENGE\_METHOD {#code_challenge_method}

> `readonly` `static` **CODE\_CHALLENGE\_METHOD**: `string` = `"S256"`

The PKCE code challenge method sent to the login page.

## Methods

### className() {#classname}

> **className**(): `string`

Returns the class name of the component.

#### Returns

`string`

The class name of the component.

#### Implementation of

`IOAuthProviderConnector.className`

***

### getCapabilities() {#getcapabilities}

> **getCapabilities**(): `IAuthenticationProviderCapabilities`

Get what the provider supports, an e-mail and password form reached through OAuth 2.0, with
passwords and profiles changed on this node.

#### Returns

`IAuthenticationProviderCapabilities`

The provider capabilities.

#### Implementation of

`IOAuthProviderConnector.getCapabilities`

***

### authorizationUrl() {#authorizationurl}

> **authorizationUrl**(`request`): `string`

Build the address of the login page with the authorization request in the query.

#### Parameters

##### request

`IOAuthAuthorizationRequest`

The values for the authorization request.

#### Returns

`string`

The authorization address.

#### Implementation of

`IOAuthProviderConnector.authorizationUrl`

***

### authenticate() {#authenticate}

> **authenticate**(`credentials`): `Promise`\<`IAuthenticationProviderIdentity`\>

Redeem an authorization code issued by the authorize endpoint. The code can only be used once,
and only with the redirect address, nonce and code verifier it was issued for.

#### Parameters

##### credentials

`IOAuthCodeExchange`

The authorization code and the values it was issued for.

#### Returns

`Promise`\<`IAuthenticationProviderIdentity`\>

The identity of the password account.

#### Throws

UnauthorizedError when the code is unknown, used, expired or does not match.

#### Implementation of

`IOAuthProviderConnector.authenticate`
