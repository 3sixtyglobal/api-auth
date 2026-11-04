# Interface: IFeature

A feature a node extension provides, such as a part of the user interface.

## Extended by

- [`IFeatureDefinition`](IFeatureDefinition.md)

## Properties

### name {#name}

> **name**: `string`

The name of the feature, unique across the node.

***

### config? {#config}

> `optional` **config?**: `object`

Settings the user interface needs to display the feature, never secrets.

#### Index Signature

\[`key`: `string`\]: `unknown`
