# Class: EntityStorageAuthenticationProviderConnector

Authentication provider that verifies passwords for accounts held in entity storage.

## Implements

- `IAuthenticationProvider`\<[`IPasswordCredentials`](../interfaces/IPasswordCredentials.md)\>

## Constructors

### Constructor

> **new EntityStorageAuthenticationProviderConnector**(`options?`): `EntityStorageAuthenticationProviderConnector`

Create a new instance of EntityStorageAuthenticationProviderConnector.

#### Parameters

##### options?

[`IEntityStorageAuthenticationProviderConnectorConstructorOptions`](../interfaces/IEntityStorageAuthenticationProviderConnectorConstructorOptions.md)

The options for the connector.

#### Returns

`EntityStorageAuthenticationProviderConnector`

## Properties

### NAMESPACE {#namespace}

> `readonly` `static` **NAMESPACE**: `string` = `"3sixty"`

The authentication provider id to register the connector with.

***

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

`IAuthenticationProvider.className`

***

### getCapabilities() {#getcapabilities}

> **getCapabilities**(): `IAuthenticationProviderCapabilities`

Get what the provider supports, a password form with passwords and profiles changed on this node.

#### Returns

`IAuthenticationProviderCapabilities`

The provider capabilities.

#### Implementation of

`IAuthenticationProvider.getCapabilities`

***

### authenticate() {#authenticate}

> **authenticate**(`credentials`): `Promise`\<`IAuthenticationProviderIdentity`\>

Verify the e-mail address and password of a password account. A legacy or outdated password
hash is replaced with an Argon2id hash, and a legacy e-mail address normalised, once the
password matches.

#### Parameters

##### credentials

[`IPasswordCredentials`](../interfaces/IPasswordCredentials.md)

The e-mail address and password.

#### Returns

`Promise`\<`IAuthenticationProviderIdentity`\>

The verified identity.

#### Throws

UnauthorizedError when the account does not exist or the password does not match.

#### Implementation of

`IAuthenticationProvider.authenticate`
