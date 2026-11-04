# Interface: IFeatureDefinition

A feature as a node extension declares it, with the roles that can use it.

## Extends

- [`IFeature`](IFeature.md)

## Properties

### name {#name}

> **name**: `string`

The name of the feature, unique across the node.

#### Inherited from

[`IFeature`](IFeature.md).[`name`](IFeature.md#name)

***

### config? {#config}

> `optional` **config?**: `object`

Settings the user interface needs to display the feature, never secrets.

#### Index Signature

\[`key`: `string`\]: `unknown`

#### Inherited from

[`IFeature`](IFeature.md).[`config`](IFeature.md#config)

***

### roles {#roles}

> **roles**: `string`[]

The roles that can use the feature, an account needs one of them, held directly or inherited.
The node seeds an authorization policy for each role of the features registered when it starts,
which the feature component checks.
