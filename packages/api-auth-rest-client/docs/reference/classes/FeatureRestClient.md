# Class: FeatureRestClient

The client to connect to the feature service.

## Extends

- `BaseRestClient`

## Implements

- `IFeatureComponent`

## Constructors

### Constructor

> **new FeatureRestClient**(`config`): `FeatureRestClient`

Create a new instance of FeatureRestClient.

#### Parameters

##### config

`IBaseRestClientConfig`

The configuration for the client.

#### Returns

`FeatureRestClient`

#### Overrides

`BaseRestClient.constructor`

## Properties

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

`IFeatureComponent.className`

***

### list() {#list}

> **list**(): `Promise`\<`IFeature`[]\>

List the features the signed in account can use.

#### Returns

`Promise`\<`IFeature`[]\>

The features.

#### Implementation of

`IFeatureComponent.list`
