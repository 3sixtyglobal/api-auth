# Variable: FeatureAuthorization

> `const` **FeatureAuthorization**: `object`

How access to a feature is checked, as the object prefix and action of its authorization policies.
The object of a feature's policies is the prefix followed by the name of the feature.

## Type Declaration

### ObjectPrefix {#objectprefix}

> `readonly` **ObjectPrefix**: `"feature:"` = `"feature:"`

The prefix of the object of a feature's policies.

### Action {#action}

> `readonly` **Action**: `"execute"` = `"execute"`

The action of a feature's policies.
