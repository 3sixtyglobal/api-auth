# Class: FeatureService

Lists the features registered with the feature factory that the signed in account can use.

## Implements

- `IFeatureComponent`

## Constructors

### Constructor

> **new FeatureService**(`options?`): `FeatureService`

Create a new instance of FeatureService.

#### Parameters

##### options?

[`IFeatureServiceConstructorOptions`](../interfaces/IFeatureServiceConstructorOptions.md)

The options for the service.

#### Returns

`FeatureService`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

***

### DEFAULT\_AUTHORIZATION\_MODEL\_ID {#default_authorization_model_id}

> `readonly` `static` **DEFAULT\_AUTHORIZATION\_MODEL\_ID**: `string` = `"system"`

The default authorization model ID the roles are given in.

## Methods

### className() {#classname}

> **className**(): `string`

Returns the class name of the component.

#### Returns

`string`

The class name of the component.

#### Implementation of

`IFeatureComponent.className`

***

### list() {#list}

> **list**(): `Promise`\<`IFeature`[]\>

List the features the signed in account can use, from those registered with the feature factory.

#### Returns

`Promise`\<`IFeature`[]\>

The features the authorization component lets the account use, without their roles.

#### Implementation of

`IFeatureComponent.list`
