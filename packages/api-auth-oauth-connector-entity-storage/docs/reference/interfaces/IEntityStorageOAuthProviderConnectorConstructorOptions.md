# Interface: IEntityStorageOAuthProviderConnectorConstructorOptions

Options for the EntityStorageOAuthProviderConnector constructor.

## Properties

### userEntityStorageType? {#userentitystoragetype}

> `optional` **userEntityStorageType?**: `string`

The entity storage for the users.

#### Default

```ts
authentication-user
```

***

### authorizationCodeEntityStorageType? {#authorizationcodeentitystoragetype}

> `optional` **authorizationCodeEntityStorageType?**: `string`

The entity storage for the authorization codes.

#### Default

```ts
authentication-authorization-code
```

***

### config {#config}

> **config**: [`IEntityStorageOAuthProviderConnectorConfig`](IEntityStorageOAuthProviderConnectorConfig.md)

The configuration for the connector.
